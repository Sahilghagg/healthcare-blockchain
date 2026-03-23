export const CONTRACT_ADDRESS = "0xeD56Bf1D4a1055c114564Ca06Ea46Fea260B4d7A";

export const CONTRACT_ABI = [
  "constructor()",
  "function authorizeDoctor(address doctor)",
  "function authorizedDoctors(address) view returns (bool)",
  "function createPendingRecord(address patient, string name, string diagnosis, string treatment, string fileHash, uint256 fee)",
  "function approveAndPay(uint256 recordId) payable",
  "function rejectRecord(uint256 recordId)",
  "function getPendingRecords(address patient) view returns ((address,address,string,string,string,string,uint256,uint256,uint8)[])",
  "function getRecord(address patient, uint256 index) view returns (string, string, string, string, uint256, uint8)",
  "function getRecordCount(address patient) view returns (uint256)",
  "function owner() view returns (address)"
];