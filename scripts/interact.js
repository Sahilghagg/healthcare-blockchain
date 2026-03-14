const { ethers } = require("hardhat");

async function main() {

  const contractAddress = "0xC42Fea3ECC8087425E2Cb4c6A736A0cDb157c0cC";

  const network = await ethers.provider.getNetwork();

  console.log("Connected Network:", network.name, network.chainId);

  // Allow ONLY Ganache
  if (network.chainId !== 1337n && network.chainId !== 31337n) {
    console.log("❌ Please run this script on Ganache / Localhost only");
    process.exit(1);
  }

  const signers = await ethers.getSigners();

  const owner = signers[0];
  const doctor = signers[1];
  const randomUser = signers[2];

  console.log("Owner:", owner.address);
  console.log("Doctor:", doctor.address);
  console.log("Random User:", randomUser.address);

  const Healthcare = await ethers.getContractFactory("Healthcare", owner);
  const healthcare = Healthcare.attach(contractAddress);

  // Authorize doctor
  const tx1 = await healthcare.authorizeDoctor(doctor.address);
  await tx1.wait();

  console.log("✅ Doctor authorized");

  // Doctor adds record (WITH IPFS HASH)
  const healthcareAsDoctor = healthcare.connect(doctor);

  const fileHash = "QmExampleIPFSHash123456"; // Example IPFS hash

  const tx2 = await healthcareAsDoctor.addRecord(
    owner.address,
    "Sahil",
    "Cold",
    "Medicine",
    fileHash
  );

  await tx2.wait();

  console.log("✅ Medical record added by doctor");

  // Read records
  const count = await healthcare.getRecordCount(owner.address);

  console.log("Total Records:", count.toString());

  if (count.toString() !== "0") {

    const record = await healthcare.getRecord(owner.address, 0);

    console.log("Patient Name:", record[0]);
    console.log("Diagnosis:", record[1]);
    console.log("Treatment:", record[2]);
    console.log("File Hash (IPFS):", record[3]);
    console.log("Timestamp:", record[4].toString());
  }

  // Unauthorized test
  const healthcareAsRandom = healthcare.connect(randomUser);

  try {

    await healthcareAsRandom.addRecord(
      owner.address,
      "Hacker",
      "Fake",
      "Nothing",
      "FakeHash"
    );

    console.log("❌ ERROR: Unauthorized user added record!");

  } catch {

    console.log("✅ Unauthorized user blocked successfully");

  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});