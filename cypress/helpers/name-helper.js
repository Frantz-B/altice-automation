// Generates a unique name with the current timestamp and a suffix
// You should pass in the entity name like 'Bidder'
exports.generateName = (suffix) => {
    const name = `${Cypress.moment().format('YY.MM.DD hh:mm:ss')}-UI ${suffix}`;
    return name;
  };

exports.generateRandomNum = maxNumber => Math.floor(Math.random() * maxNumber);
