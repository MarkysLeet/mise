const assert = require('assert');

// A simple sanity check for the rows logic

const N = 72;
let currentRows = 1;
// we want to add 71 rows
let rowsToAdd = N - currentRows;

console.log("StartIndex:", 5 + currentRows);
console.log("EndIndex:", 5 + currentRows + rowsToAdd);

console.log("Source StartIndex:", 5 + currentRows - 1);
console.log("Source EndIndex:", 5 + currentRows);

// When N=72, currentRows=1
// StartIndex: 6
// EndIndex: 6 + 71 = 77
// Source StartIndex: 5 (row 6)
// Source EndIndex: 6 (row 6)

const N2 = 70;
const currentRows2 = 72;

const rowsToRemove = currentRows2 - N2;
console.log("Remove StartIndex:", 5 + N2);
console.log("Remove EndIndex:", 5 + N2 + rowsToRemove);

// StartIndex: 75
// EndIndex: 77
