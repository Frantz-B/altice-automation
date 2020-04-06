// Generates a unique name with the current timestamp and a suffix
// You should pass in the entity name like 'Bidder'
exports.generateName = (suffix) => {
    const name = `z${Cypress.moment().format('YY.MM.DD hh:mm:ss')}-UI ${suffix}`;
    return name;
  };