const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x33d73aDf55625Ac3D8e0921B39a79F55d8F8a789";

  const network = await ethers.provider.getNetwork();

  console.log("Connected Network:", network.name, network.chainId);

  if (network.chainId !== 1337n && network.chainId !== 31337n) {
    console.log(" Please run this script on Ganache / Localhost only");
    process.exit(1);
  }

  const signers = await ethers.getSigners();

  const owner = signers[0];
  const doctor = signers[1];
  const patient = signers[2];

  console.log("\n========== ACCOUNTS ==========");
  console.log("Owner Address:", owner.address);
  console.log("Doctor Address:", doctor.address);
  console.log("Patient Address:", patient.address);
  console.log("==============================\n");

  const Healthcare = await ethers.getContractFactory("Healthcare", owner);
  const healthcare = Healthcare.attach(contractAddress);

  // Check current doctor authorization status
  console.log("Checking doctor authorization status...");
  const isDoctorBefore = await healthcare.authorizedDoctors(doctor.address);
  console.log("Doctor authorized before:", isDoctorBefore);

  if (!isDoctorBefore) {
    // Authorize doctor
    console.log("\n Authorizing doctor...");
    const tx1 = await healthcare.authorizeDoctor(doctor.address);
    await tx1.wait();
    console.log(" Doctor authorized successfully!");
    
    const isDoctorAfter = await healthcare.authorizedDoctors(doctor.address);
    console.log("Doctor authorized after:", isDoctorAfter);
  } else {
    console.log(" Doctor is already authorized!");
  }

  // Step 1: Doctor creates pending record (with fee)
  console.log("\n Creating pending record...");
  const healthcareAsDoctor = healthcare.connect(doctor);
  const fee = ethers.parseEther("0.05"); // 0.05 ETH consultation fee
  const fileHash = "QmExampleIPFSHash123456";

  console.log("  Patient:", patient.address);
  console.log("  Patient Name: Sahil");
  console.log("  Diagnosis: Cold");
  console.log("  Treatment: Medicine");
  console.log("  Fee:", ethers.formatEther(fee), "ETH");

  const tx2 = await healthcareAsDoctor.createPendingRecord(
    patient.address,
    "Sahil",
    "Cold",
    "Medicine",
    fileHash,
    fee
  );
  await tx2.wait();
  console.log(" Pending record created by doctor");
  console.log("  Transaction Hash:", tx2.hash);

  // Check pending records for patient
  console.log("\n Checking pending records...");
  const pending = await healthcare.getPendingRecords(patient.address);
  console.log("Pending Records Count:", pending.length);
  
  if (pending.length > 0) {
    console.log("  Record Details:");
    console.log("    - Patient:", pending[0][0]);
    console.log("    - Doctor:", pending[0][1]);
    console.log("    - Name:", pending[0][2]);
    console.log("    - Diagnosis:", pending[0][3]);
    console.log("    - Treatment:", pending[0][4]);
    console.log("    - Fee:", ethers.formatEther(pending[0][6]), "ETH");
  }

  // Step 2: Patient approves and pays
  console.log("\n Patient approving and paying...");
  const healthcareAsPatient = healthcare.connect(patient);
  const recordId = 0;
  
  // Check patient balance before payment
  const balanceBefore = await ethers.provider.getBalance(patient.address);
  console.log("Patient balance before:", ethers.formatEther(balanceBefore), "ETH");
  
  const tx3 = await healthcareAsPatient.approveAndPay(recordId, { value: fee });
  await tx3.wait();
  console.log("Patient approved and paid");
  console.log("  Transaction Hash:", tx3.hash);
  
  // Check patient balance after payment
  const balanceAfter = await ethers.provider.getBalance(patient.address);
  console.log("Patient balance after:", ethers.formatEther(balanceAfter), "ETH");
  console.log("Paid:", ethers.formatEther(fee), "ETH");

  // Read records
  console.log("\n Reading all records...");
  const count = await healthcare.getRecordCount(patient.address);
  console.log("Total Records:", count.toString());

  if (count.toString() !== "0") {
    const record = await healthcare.getRecord(patient.address, 0);
    console.log("\nRecord Details:");
    console.log("  Patient Name:", record[0]);
    console.log("  Diagnosis:", record[1]);
    console.log("  Treatment:", record[2]);
    console.log("  File Hash:", record[3]);
    console.log("  Timestamp:", record[4].toString());
    console.log("  Status:", record[5] === 0 ? "Pending" : record[5] === 1 ? "Paid" : "Rejected");
  }

  // Check pending records again
  const pendingAfter = await healthcare.getPendingRecords(patient.address);
  console.log("\nPending Records after payment:", pendingAfter.length);
  
  console.log("\n All tests completed successfully!");
}

main().catch((error) => {
  console.error("\n❌ Error:", error);
  process.exitCode = 1;
});