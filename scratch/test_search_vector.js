const { updateSearchVector } = require('./lib/search');

async function test() {
  try {
    await updateSearchVector('cmrrc7b820001txx8h77tfiw0');
    console.log('success');
  } catch(e) {
    console.error(String(e));
  }
}
test();
