// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Healthcare {

    struct Record {
        string patientName;
        string diagnosis;
        string treatment;
        uint256 timestamp;  // keep timestamp first
        string fileHash;    // fileHash comes last
    }

    mapping(address => Record[]) private patientRecords;
    mapping(address => bool) public authorizedDoctors;

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // Only contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    // Only authorized doctors
    modifier onlyDoctor() {
        require(authorizedDoctors[msg.sender], "Not authorized doctor");
        _;
    }

    // Owner can authorize doctors
    function authorizeDoctor(address doctor) public onlyOwner {
        authorizedDoctors[doctor] = true;
    }

    // Add a medical record (doctor-only)
    function addRecord(
        address patient,
        string memory name,
        string memory diagnosis,
        string memory treatment,
        string memory fileHash
    ) public onlyDoctor {
        patientRecords[patient].push(
            Record(name, diagnosis, treatment, block.timestamp, fileHash)
        );
    }

    // Get number of records for a patient
    function getRecordCount(address patient)
        public
        view
        returns (uint256)
    {
        return patientRecords[patient].length;
    }

    // Get a specific record
    function getRecord(address patient, uint256 index)
        public
        view
        returns (
            string memory,
            string memory,
            string memory,
            uint256,
            string memory
        )
    {
        Record memory r = patientRecords[patient][index];
        return (r.patientName, r.diagnosis, r.treatment, r.timestamp, r.fileHash);
    }
}