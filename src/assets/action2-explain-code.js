/**
 * Example JavaScript Utility Module
 * Purpose: Provides array manipulation and statistical helper functions
 * Author: Demo Team
 * Last updated: March 2026
 */

export function sumArray(arr) {
  if (!Array.isArray(arr)) throw new TypeError("Expected an array");
  return arr.reduce((a, b) => a + b, 0);
}

export function averageArray(arr) {
  const sum = sumArray(arr);
  return sum / arr.length;
}

export function maxArray(arr) {
  return arr.length ? Math.max(...arr) : undefined;
}

export function minArray(arr) {
  return arr.length ? Math.min(...arr) : undefined;
}

// Advanced example: moving average
export function movingAverage(arr, windowSize = 3) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const result = [];
  for (let i = 0; i <= arr.length - windowSize; i++) {
    const window = arr.slice(i, i + windowSize);
    result.push(averageArray(window));
  }
  return result;
}

// Sample usage
const numbers = [10, 20, 30, 40, 50, 60];
console.log("Sum:", sumArray(numbers));
console.log("Average:", averageArray(numbers));
console.log("Max:", maxArray(numbers));
console.log("Min:", minArray(numbers));
console.log("Moving Average (window=3):", movingAverage(numbers));