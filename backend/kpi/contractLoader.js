/**
 * kpi/contractLoader.js
 * Loads and caches all KPI YAML contracts from the kpi-contracts/ directory.
 * NON-LLM — pure file I/O + YAML parsing.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const yaml = require('js-yaml');

const CONTRACTS_DIR = path.join(__dirname, '..', '..', 'kpi-contracts');

let _cache = null;

/**
 * Load all KPI contracts. Cached after first load.
 * @returns {Object} Map of kpi_id -> contract object
 */
function loadContracts() {
  if (_cache) return _cache;

  _cache = {};
  const files = fs.readdirSync(CONTRACTS_DIR).filter(f => f.endsWith('.yaml'));

  for (const file of files) {
    const raw      = fs.readFileSync(path.join(CONTRACTS_DIR, file), 'utf8');
    const contract = yaml.load(raw);
    _cache[contract.id] = contract;
  }

  console.log(`[contractLoader] Loaded ${Object.keys(_cache).length} KPI contracts.`);
  return _cache;
}

/**
 * Get a single contract by KPI id.
 * @param {string} kpiId
 * @returns {Object|null}
 */
function getContract(kpiId) {
  const contracts = loadContracts();
  return contracts[kpiId] || null;
}

/**
 * Get all contracts as an array.
 * @returns {Array}
 */
function getAllContracts() {
  return Object.values(loadContracts());
}

/**
 * Reload contracts from disk (useful after edits in dev).
 */
function reloadContracts() {
  _cache = null;
  return loadContracts();
}

module.exports = { loadContracts, getContract, getAllContracts, reloadContracts };
