// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Healthcare {
    address public owner;
    
    // Role management
    mapping(address => bool) public authorizedDoctors;
    
    // Record management
    struct MedicalRecord {
        address patient;
        address doctor;
        string name;
        string diagnosis;
        string treatment;
        string fileHash;
        uint256 fee;
        uint256 timestamp;
        Status status;
    }
    
    enum Status {
        Pending,    // Waiting for patient approval & payment
        Paid,       // Payment done, record finalized
        Rejected    // Patient rejected the record
    }
    
    mapping(address => MedicalRecord[]) private patientRecords;
    mapping(address => MedicalRecord[]) private pendingRecords;
    
    event RecordCreated(address indexed patient, address indexed doctor, uint256 recordId, uint256 fee);
    event RecordPaid(address indexed patient, address indexed doctor, uint256 recordId, uint256 amount);
    event RecordRejected(address indexed patient, address indexed doctor, uint256 recordId);
    
    constructor() {
        owner = msg.sender;
        authorizedDoctors[owner] = true;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyDoctor() {
        require(authorizedDoctors[msg.sender], "Only authorized doctors");
        _;
    }
    
    // Step 1: Doctor creates pending record (patient hasn't paid yet)
    function createPendingRecord(
        address _patient,
        string memory _name,
        string memory _diagnosis,
        string memory _treatment,
        string memory _fileHash,
        uint256 _fee
    ) public onlyDoctor {
        require(_fee > 0, "Fee must be greater than 0");
        
        MedicalRecord memory newRecord = MedicalRecord({
            patient: _patient,
            doctor: msg.sender,
            name: _name,
            diagnosis: _diagnosis,
            treatment: _treatment,
            fileHash: _fileHash,
            fee: _fee,
            timestamp: block.timestamp,
            status: Status.Pending
        });
        
        // Store in patient's pending records
        pendingRecords[_patient].push(newRecord);
        patientRecords[_patient].push(newRecord);
        
        emit RecordCreated(_patient, msg.sender, patientRecords[_patient].length - 1, _fee);
    }
    
    // Step 2: Patient approves and pays
    function approveAndPay(uint256 _recordId) public payable {
        require(_recordId < patientRecords[msg.sender].length, "Invalid record ID");
        MedicalRecord storage record = patientRecords[msg.sender][_recordId];
        require(record.status == Status.Pending, "Record already processed");
        require(msg.sender == record.patient, "Only patient can pay");
        require(msg.value == record.fee, "Incorrect payment amount");
        
        // Transfer ETH to doctor
        payable(record.doctor).transfer(msg.value);
        
        // Update status
        record.status = Status.Paid;
        
        // Also update pending records
        for (uint i = 0; i < pendingRecords[msg.sender].length; i++) {
            if (pendingRecords[msg.sender][i].timestamp == record.timestamp) {
                pendingRecords[msg.sender][i].status = Status.Paid;
                break;
            }
        }
        
        emit RecordPaid(msg.sender, record.doctor, _recordId, msg.value);
    }
    
    // Patient rejects record
    function rejectRecord(uint256 _recordId) public {
        require(_recordId < patientRecords[msg.sender].length, "Invalid record ID");
        MedicalRecord storage record = patientRecords[msg.sender][_recordId];
        require(record.status == Status.Pending, "Record already processed");
        require(msg.sender == record.patient, "Only patient can reject");
        
        record.status = Status.Rejected;
        
        emit RecordRejected(msg.sender, record.doctor, _recordId);
    }
    
    // Get pending records for a patient
    function getPendingRecords(address _patient) public view returns (MedicalRecord[] memory) {
        return pendingRecords[_patient];
    }
    
    // Get all records for a patient (with status)
    function getRecord(address _patient, uint256 _index) public view returns (
        string memory, string memory, string memory, string memory, uint256, Status
    ) {
        require(_index < patientRecords[_patient].length, "Invalid index");
        MedicalRecord memory record = patientRecords[_patient][_index];
        return (
            record.name,
            record.diagnosis,
            record.treatment,
            record.fileHash,
            record.timestamp,
            record.status
        );
    }
    
    function getRecordCount(address _patient) public view returns (uint256) {
        return patientRecords[_patient].length;
    }
    
    function authorizeDoctor(address _doctor) public onlyOwner {
        authorizedDoctors[_doctor] = true;
    }
}