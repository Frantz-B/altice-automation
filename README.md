# Altice Automation
![Test Runtime](https://img.shields.io/badge/Tests%20Runtime-~2mins-brightgreen) ![GitHub contributors](https://img.shields.io/github/contributors/frantz-b/altice-automation?color=green)

Automated Testing Suite for Altice

This testing framework is a WIP, built using [Cypress](https://www.cypress.io).

## ⚠️ - Prerequisites
- Make sure you have [Node.js](https://nodejs.org/en/download/) installed
- Make sure you have [yarn](https://classic.yarnpkg.com/en/docs/install) installed

## 💻 - Getting Started 
- `git clone https://github.com/Frantz-B/altice-automation.git`
- `yarn install`

## ⚡ - Running Tests
- `yarn ui` : Opens Cypress UI Dashboard to run selected test(s) 
- `yarn test` : Runs all tests in headless mode within the Command Line 
  * To run individual test in the command line; `yarn test -s cypress/integrations/{name of test file}.js`

## ✍🏽 - Writing Tests

To add new tests, simply add test cases under cypress/integrations. See existing tests or Cypress documentation for more information.

## 🤖 - CI

Not yet 

The default base URL is:
`https://altice.dev.kargo.com`