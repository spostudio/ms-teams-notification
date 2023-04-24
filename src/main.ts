import * as core from '@actions/core'
import {Octokit} from '@octokit/rest'
import axios from 'axios'
import moment from 'moment-timezone'
import {createMessageCard} from './message-card'

const escapeMarkdownTokens = (text: string) =>
  text
    .replace(/\n\ {1,}/g, '\n ')
    .replace(/\_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\|/g, '\\|')
    .replace(/#/g, '\\#')
    .replace(/-/g, '\\-')
    .replace(/>/g, '\\>')

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', {required: true})
    const msTeamsWebhookUri: string = core.getInput('ms-teams-webhook-uri', {
      required: true
    })

    const notificationSummary =
      core.getInput('notification-summary') || 'GitHub Action Notification'
    const notificationColor = core.getInput('notification-color') || '0b93ff'
    const timezone = core.getInput('timezone') || 'UTC'
    const customActionsRaw = core.getInput( 'custom-actions' ).split(',');
    /** @type {{name:string,url:string}[]} */
    const customActions = [];
    for ( let i1 = 0; i1 < customActionsRaw.length / 2; i1++ )
      customActions.push( { name: customActionsRaw[i1*2], url: customActionsRaw[i1*2+1] } );

    const timestamp = moment()
      .tz(timezone)
      .format('dddd, MMMM Do YYYY, h:mm:ss a z')

    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')
    const sha = process.env.GITHUB_SHA || ''
    const runId = process.env.GITHUB_RUN_ID || ''
    const runNum = process.env.GITHUB_RUN_NUMBER || ''
    const params = {owner, repo, ref: sha}
    const repoName = params.owner + '/' + params.repo
    const repoUrl = `https://github.com/${repoName}`

    const octokit = new Octokit({auth: `token ${githubToken}`})
    const commit = await octokit.repos.getCommit(params)
    const author = commit.data.author

    const messageCard = await createMessageCard(
      notificationSummary,
      notificationColor,
      commit,
      author,
      runNum,
      runId,
      repoName,
      sha,
      repoUrl,
      timestamp,
      customActions
    )

    console.log(messageCard)

    axios
      .post(msTeamsWebhookUri, messageCard)
      .then(function(response) {
        console.log(response)
        core.debug(response.data)
      })
      .catch(function(error) {
        core.debug(error)
      })
  } catch (error) {
    console.log(error)
    core.setFailed(error.message)
  }
}

run()
