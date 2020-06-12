// Description:
//  In-memory polls. Inspired by SimplePoll & votador.js (@juanbrujo & @antonishen)
// Dependencies:
//  None
// Usage:
//  huemul poll start "option1" "option2"
// Options:
//  limit: (1-100 | -1 = unlimited) Voting limit per user. Default: 1
//  expiresIn: (Number) Amount of time the poll with last. Defaults to 30 minutes. 
// Author:
//  Dilip Ramirez <@dukuo> <dilip.ramirez@gmail.com>

const { block, element, object, TEXT_FORMAT_MRKDWN, TEXT_FORMAT_PLAIN } = require('slack-block-kit')
const { WebClient } = require('@slack/web-api')
const cron = require('node-cron')
const atob = require('atob')

const token = process.env.HUBOT_SLACK_TOKEN
const web = new WebClient(token)

const { text, } = object
const {
    button,
} = element
const { section, actions, divider, context, image } = block

// https://gist.github.com/jed/982883
const uuid = function b(a) { return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, b) }

module.exports = bot => {
    const debug = false

    const MINUTE_IN_MS = 60 * 1e3

    // defaults
    const FALLBACK_CHANNEL = 'random'

    // Used as the main bot command
    const POLL_KEYWORD = 'poll'
    const POLL_MIN_OPTIONS = 2
    const POLL_VOTING_LIMIT = 10

    // Events
    const ON_POLL_CHOICE = 'poll_choice'
    const ON_REMOVE_POLL = 'remove_poll'
    const ON_FINISH_POLL = 'finish_poll'

    // Text labels
    // TODO: Build or implement a i18n strategy
    const TXT_VOTE_BUTTON = 'Votar'
    const TXT_POLL_BY = 'Encuesta por'
    const TXT_POLL_RESULTS = 'Poll results'
    const TXT_FINISH_POLL_BUTTON = 'Finalizar'
    const TXT_REMOVE_POLL_BUTTON = 'Eliminar'
    const TXT_PERCENTAGE_SYMBOL = '%'
    const TXT_MOST_VOTED_OPTION = ':star:'
    const TXT_CREATING_POLL_STATUS_MESSAGE = `*Creating poll*. If you see this message for more than 2 seconds something might have gone wrong. Please stand by...`
    const TXT_FINISH_POLL_STANDBY = '*Poll:* Fetching poll results. If you see this message for more than 2 seconds something might have gone wrong. Please stand by... '
    const TXT_POLL_MIN_OPTIONS = `*New poll*: You must have at least ${POLL_MIN_OPTIONS} options to create a new poll.`
    const TXT_TITLE_SEPARATOR = '\\n'
    const TXT_VOTER_PLURAL = 'Voters'
    const TXT_VOTER_NONE = 'No votes'
    const TXT_VOTER_SINGULAR = 'Voter'
    const TXT_VOTE_SUCCESSFUL = '*Poll:* Vote successful'
    const TXT_VOTE_ERROR = '*Poll:* An error ocurred while voting. Please try again.'
    const TXT_VOTE_CANT = '*Poll:* The user can\'t vote or has reached it\'s voting limit in this poll.'
    const TXT_POLL_NOT_FOUND = '*Poll*: Unable to find the selected poll.'
    const TXT_UPDATING_POLL = '*Poll*: Updating voting results...'
    const TXT_POLL_FINISH_NO_PERMISSON = '*Poll:* Only the poll author can finish a it.'
    const TXT_POLL_FINISHED = '*Poll:* This poll has ended.'
    const TXT_POLL_REMOVED_SUCCESSFULLY = '*Poll:*: Poll deleted successfully.'
    const TXT_POLL_REMOVED_NO_PERMISSION = '*Poll*: Only the author can remove it.'

    // Clean scheduler cron settings
    const CLEANING_CRON_SETTINGS = "0 * * * *" // every 1 hour https://crontab.guru/every-1-hour
    let cleaningCron = null

    const optionShape = {
        block: {},
        context: {},
    }

    const managedPollShape = {
        active: false,
        expiresIn: 5 * MINUTE_IN_MS,
        scheduled: false,
        begin: null,
        block: {},
        metadata: {},
        voters: []
    }

    const pollMetadataShape = {
        multiple: false,
        limit: POLL_VOTING_LIMIT,
        channel: ''
    }

    const pollManager = {
        scheduled: [],
        polls: {},
    }


    // Block Builders

    const buildPollOptions = (data, pId) => {
        const options = []
        data.forEach(({ title, subtitle }) => {
            const id = uuid()
            const pollOption = {
                p: pId,
                o: id
            }
            const concatId = Buffer.from(JSON.stringify(pollOption)).toString('base64')

            options.push({
                ...optionShape,
                value: id,
                title,
                block: (finished = false) => buildOptionBlock({
                    title,
                    subtitle,
                    value: concatId,
                    finished
                }),
                context: () => buildOptionContext(pId, id)
            })
        })
        return options
    }


    const buildOptionContext = (pollId = undefined, optId = undefined) => {
        const voters = pollId && optId ? getVotesByPollOption(pollId, optId) : []
        debug && console.log("VOTERS", voters)
        const votersCount = voters.length

        const votersBlock = voters.map(voter => buildVoterBlock(voter))
        const votersText = votersCount > 1 ? TXT_VOTER_PLURAL : votersCount < 1 ? TXT_VOTER_NONE : TXT_VOTER_SINGULAR
        const votersCountBlock =
            text(`${votersCount > 0 ? `${votersCount} ` : ''}${votersText}`,
                votersCount > 0 ? TEXT_FORMAT_PLAIN : TEXT_FORMAT_MRKDWN,
                { emoji: votersCount > 0 ? true : false }
            )

        votersBlock.push(votersCountBlock)

        return context(votersBlock)
    }

    const buildVoterBlock = voter => {
        const user = bot.brain.usersForFuzzyName(voter)[0]
        if (user) {

            const { name, slack: { profile: { image_24: avatar } } } = user
            const block = image(avatar, name)
            return block
        }
    }

    const buildPollBlock = ({
        id,
        title,
        name,
        options,
        finished = false
    }) => {
        const header = section(
            text(`*${title}* ${TXT_POLL_BY} @${name}`, TEXT_FORMAT_MRKDWN)
        )
        const _divider = divider()
        const pollActions = buildPollActions(id, finished)

        const optionsBlocks = options.map(opt => opt.block(finished))

        const optionsContext = options.map(opt => opt.context())

        const blocks = [
            header,
            _divider,
        ]
        optionsBlocks.forEach((optBlock, i) => {
            blocks.push(optBlock)
            blocks.push(optionsContext[i])
        })

        blocks.push(_divider)
        blocks.push(pollActions)
        blocks.push(_divider)

        return blocks
    }

    const buildAndPushPoll = (data) => {
        const {
            id,
            title,
            author: {
                name,
            },
            options,
            limit = pollMetadataShape.limit,
            multiple = pollMetadataShape.multiple,
            expiresIn,
            channel,
        } = {
            ...managedPollShape,
            ...data
        }

        debug && console.log("CREATING POLL WITH DATA: ", data)

        const block = buildPollBlock({
            id,
            title,
            name,
            options
        })

        pushPoll(id, {
            block,
            metadata: {
                ...pollMetadataShape,
                title,
                author: name,
                channel,
                limit,
                multiple,
            },
            options,
            expiresIn,
        })

        return {
            id,
            block
        }
    }

    const buildPollActions = (pollId, finished = false) => {
        const endPollBtn = buildButtonBlock(ON_FINISH_POLL, TXT_FINISH_POLL_BUTTON, pollId, 'primary')
        const removePollBtn = buildButtonBlock(ON_REMOVE_POLL, TXT_REMOVE_POLL_BUTTON, pollId, 'danger')
        const pollFinishedSection = section(text(TXT_POLL_FINISHED, TEXT_FORMAT_MRKDWN))
        const actionBlock = actions(
            [endPollBtn, removePollBtn], {
            blockId: `pollActions-${pollId}`
        })

        return finished ? pollFinishedSection : actionBlock
    }

    const buildButtonBlock = (actionId, text, value, style = undefined) => {
        const settings = {
            value
        }
        if (style) settings.style = style
        return button(actionId, text, settings,
        )
    }

    const buildOptionBlock = ({
        title,
        subtitle = null,
        value,
        finished = false
    }) => {

        const newButton = buildButtonBlock(ON_POLL_CHOICE, TXT_VOTE_BUTTON, value)
        // const newText = 
        // const votersBlock = buildOptionContext(pollId, optionId)
        const settings = finished ? {} : {
            accessory: newButton
        }

        return section(
            text(`*${title}*${subtitle !== null ? `\n${subtitle}` : ''}`, TEXT_FORMAT_MRKDWN),
            settings
        )
    }

    const buildPollResultsBlock = id => {
        const poll = getPoll(id)
        if (poll) {
            const { options, metadata: { title, author } } = poll

            const header = section(
                text(`*${TXT_POLL_RESULTS}: * *${title}* ${TXT_POLL_BY} @${author}`, TEXT_FORMAT_MRKDWN)
            )
            const _divider = divider()

            const blocks = [
                _divider,
                header,
                _divider,
            ]

            const pollTotalVotes = countVotesFromPoll(poll)

            debug && console.log("TOTAL VOTES: ", pollTotalVotes)

            const optionBlocksWithPercentagesAndContext = []

            options.forEach(option => {
                const optionVotePercentage = getVotesByPollOption(id, option.value).length * 1e2 / pollTotalVotes
                const optionBlock = option.block(true)
                const optionContext = option.context()
                optionBlocksWithPercentagesAndContext.push([optionVotePercentage, optionBlock, optionContext, _divider])
            })

            const orderedResults = optionBlocksWithPercentagesAndContext.sort((a, b) => b[0] - a[0])
            const orderedResultsWithTextLabel = orderedResults.map((result, i) => {
                const percentageTextBlockLabel = `${result[0] > 0 ? result[0] : 0}${TXT_PERCENTAGE_SYMBOL}${i === 0 && result[0] > 0 ? ` - *${TXT_MOST_VOTED_OPTION}*` : ''}`
                const textSectionBlock = section(
                    text(percentageTextBlockLabel, TEXT_FORMAT_MRKDWN)
                )
                return [
                    textSectionBlock,
                    ...result.slice(1),
                ]
            })
            
            orderedResultsWithTextLabel.forEach(result => blocks.push(...result))

            debug && console.log(optionBlocksWithPercentagesAndContext)

            return blocks
        }
        return []
    }

    // Poll management

    const startPoll = (pollId, cb) => {
        const poll = getPoll(pollId)
        if (poll) {
            const { expiresIn } = poll
            poll.begin = () => setTimeout(() => cb(), expiresIn)

            poll.timer = poll.begin()
        }
    }

    const getPoll = id => pollManager.polls[id]

    const pushPoll = (id = uuid(), config = {}) => {
        pollManager.polls[id] = {
            ...managedPollShape,
            ...config
        }
        return id
    }

    const removePoll = (pollId) => delete pollManager.polls[pollId]

    const finishPoll = async (pollId) => {
        const poll = getPoll(pollId)
        if (poll) {
            clearInterval(poll.timer)
            poll.timer = undefined
            poll.active = false

            await handleRefreshPoll(pollId, true)
            await handleShowResults(pollId)
        }
    }

    const doVotePoll = (pollId, optionId, username) => {
        /**
         * Get poll
         * insert voter if not present
         * push option key
         * update poll
         * return boolean
         */
        const poll = getPoll(pollId)
        // debug && console.log("POLL FOUND", poll)
        if (poll) {
            const newVoters = { ...poll.voters }
            if (newVoters[username]) {
                newVoters[username][optionId] = true
            } else {
                newVoters[username] = {
                    [optionId]: true
                }
            }
            poll.voters = { ...newVoters }
            // debug && console.log("NEW VOTERS", newVoters)
            return true
        }

        return false

    }

    const handleRefreshPoll = async (id, finished = false) => {
        const poll = getPoll(id)
        if (poll) {
            const { metadata: { title, author: name, channel, }, ts, options, } = poll
            const block = buildPollBlock({
                id,
                title,
                name,
                options,
                finished
            })
            poll.block = block

            return web.chat.update({
                channel,
                ts,
                text: TXT_UPDATING_POLL,
                blocks: poll.block
            })
        }
        return handlePollNotFound()
    }

    const handleShowResults = async (pollId, finished = false) => {
        // Send a message with the results of the poll
        const poll = getPoll(pollId)
        if (poll) {
            const { metadata: { channel } } = poll

            debug && console.log(poll)
            const resultsBlock = buildPollResultsBlock(pollId)

            return await web.chat.postMessage({
                channel,
                blocks: resultsBlock,
                text: TXT_FINISH_POLL_STANDBY,
            })
        } else {
            return handlePollNotFound()
        }
    }



    // Utils

    const parseTitleAndSubtitle = commands => commands.map(cmd => {
        const split = cmd.split(TXT_TITLE_SEPARATOR)
        return {
            title: split[0],
            subtitle: split[1] ? split[1] : undefined
        }
    })


    const getVotesByPollOption = (pollId, optId) => {
        const poll = getPoll(pollId)
        if (poll) {
            const pollVoters = poll.voters
            const voteOptionCount = []
            debug && console.log("POLL VOTERS: ", pollVoters)

            // Count votes
            Object.keys(pollVoters)
                .forEach(vk => {
                    const voter = pollVoters[vk]
                    voter && Object.keys(voter).forEach(vote => {
                        if (vote === optId) voteOptionCount.push(vk)
                    })
                })

            debug && console.log("VOTE COUNT: ", voteOptionCount)

            return voteOptionCount
        }
        return []
    }

    const countVotesFromPoll = (poll) => {
        const { voters } = poll
        debug && console.log("COUNTING VOTES FROM VOTERS: ", voters)
        return Object.keys(voters).reduce((acc, curr, i, arr) => {
            return acc += Object.keys(voters[curr]).length
        }, 0)
    }

    const cleanCommands = (cmd) => cmd.map(c => c.substring(1, c.length - 1))

    const canUserVoteOnPollOption = (pollId, optionId, username) => {
        const poll = getPoll(pollId)

        if (poll) {
            const voters = poll.voters

            if (!voters[username]) {
                return true
            } else {
                const { limit, multiple } = poll.metadata
                const voterData = voters[username]
                const userVoteCount = Object.keys(voterData).length

                if (userVoteCount > 0 && (limit === userVoteCount || !multiple)) return false

                if (voterData[optionId]) return false

                return true
            }
        }
        return false
    }

    // Handlers

    const handlePollCreation = async (payload) => {
        const { message: { room: channel, text, user: { name } } } = payload
        let splitCommand = text.split(POLL_KEYWORD)
        const settings = splitCommand[1]

        // All commands should be on quotes (eg. huemul poll "title" "option1" "option 2")
        // The order is important; first one will always be the poll's title. 
        const commands = cleanCommands(settings.match(/(["'])(?:(?=(\\?))\2.)*?\1/g))

        const title = commands[0]
        commands.shift()

        splitCommand = parseTitleAndSubtitle(commands)

        if (splitCommand.length < POLL_MIN_OPTIONS) {
            return await web.chat.postMessage({
                channel,
                attachments: [
                    {
                        text: TXT_POLL_MIN_OPTIONS
                    }
                ]
            })
        }
        const pollId = uuid()
        const options = buildPollOptions(splitCommand, pollId)

        const author = bot.brain.usersForFuzzyName(name)[0]

        const pollData = {
            id: pollId,
            title,
            author,
            options,
            channel,
        }
        const newPoll = buildAndPushPoll(pollData)
        // const pollId = newPoll.id
        const pollBlock = newPoll.block

        debug && console.log(pollBlock)
        const response = TXT_CREATING_POLL_STATUS_MESSAGE
        const result = await web.chat.postMessage({
            callback_id: `${ON_POLL_CHOICE}`,
            channel,
            text: response,
            blocks: pollBlock,
            attachments: [
                {
                    callback_id: `${ON_POLL_CHOICE}`,
                }
            ]
        })

        if (result) {
            const poll = getPoll(newPoll.id)
            poll.ts = result.ts
            startPoll(newPoll.id, () => finishPoll(newPoll.id))
        }
    }

    const handleUserChoice = async payload => {
        const { user: { username }, actions, channel: { id: channelId } } = payload

        const optionData = actions.shift()

        const parsedMetadata = JSON.parse(atob(Buffer.from(optionData.value, 'base64')))
        const { p: pollId, o: optionId } = parsedMetadata

        debug && console.log(pollId, optionId, username)

        if (pollId && optionId) {
            const userCanVote = canUserVoteOnPollOption(pollId, optionId, username)
            if (userCanVote) {
                const pollVote = doVotePoll(pollId, optionId, username)
                if (pollVote) {
                    await handleRefreshPoll(pollId)

                    return await web.chat.postMessage({
                        channel: channelId,
                        text: TXT_VOTE_SUCCESSFUL
                    })
                }
            } else {
                return await web.chat.postMessage({
                    channel: channelId,
                    text: TXT_VOTE_CANT,
                })
            }
        }

        return await web.chat.postMessage({
            channel: channelId,
            text: TXT_VOTE_ERROR,
        })
    }

    const handleFinishPoll = payload => {
        const { user: { username }, actions, channel: { id: channelId } } = payload
        const optionData = actions.shift()

        const pollId = optionData.value
        const poll = getPoll(pollId)

        if (poll) {
            if (poll.metadata.author === username) return finishPoll(pollId)
            else return web.chat.postMessage({
                channel: channelId,
                text: TXT_POLL_FINISH_NO_PERMISSON
            })
        }
        return handlePollNotFound(channelId)
    }

    const handleRemovePoll = async payload => {
        const { user: { username }, actions, channel: { id: channelId } } = payload

        const optionData = actions.shift()

        const pollId = optionData.value
        const poll = getPoll(pollId)
        if (poll) {
            if (poll.metadata.author === username) {
                if (removePoll(pollId)) {
                    await web.chat.delete({
                        channel: channelId,
                        ts: poll.ts
                    })
                    return web.chat.postMessage({
                        channel: channelId,
                        text: TXT_POLL_REMOVED_SUCCESSFULLY
                    })
                }
            } else {
                return web.chat.postMessage({
                    channel: channelId,
                    text: TXT_POLL_REMOVED_NO_PERMISSION
                })
            }
        }
        return handlePollNotFound(channelId)
    }

    const handlePollNotFound = (channel = FALLBACK_CHANNEL) => web.chat.postMessage({
        channel,
        text: TXT_POLL_NOT_FOUND,
    })


    const startPollCleanCron = () => {
        cleaningCron = cron.schedule(CLEANING_CRON_SETTINGS, handlePollCleaning)
    }
    const handlePollCleaning = () => {
        debug && console.log("Cleaning inactive polls...")
        Object.keys(pollManager.polls).map((id, i) => !pollManager.polls[id].active && !pollManager.polls[id].scheduled && removePoll(id))
    }

    const stopPollCleanCron = () => cleaningCron.stop()

    const exitProcess = () => {
        stopPollCleanCron()
    }


    bot.respond(/(?:poll)(.*)/g, handlePollCreation)
    bot.on(ON_POLL_CHOICE, handleUserChoice)
    bot.on(ON_FINISH_POLL, handleFinishPoll)
    bot.on(ON_REMOVE_POLL, handleRemovePoll)

    startPollCleanCron()
    process.on('exit', exitProcess)
}