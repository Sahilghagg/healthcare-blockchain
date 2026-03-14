const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Healthcare Contract", function () {

  let healthcare;
  let owner;
  let doctor;
  let randomUser;

  beforeEach(async function () {
    const Healthcare = await ethers.getContractFactory("Healthcare");
    healthcare = await Healthcare.deploy();
    await healthcare.waitForDeployment();

    const signers = await ethers.getSigners();
    owner = signers[0];
    doctor = signers[1];
    randomUser = signers[2];
  });

  it("Should authorize a doctor", async function () {
    await healthcare.connect(owner).authorizeDoctor(doctor.address);

    const isAuthorized = await healthcare.authorizedDoctors(doctor.address);
    expect(isAuthorized).to.equal(true);
  });

  it("Authorized doctor can add record", async function () {
    await healthcare.connect(owner).authorizeDoctor(doctor.address);

    await healthcare.connect(doctor).addRecord(
      owner.address,
      "Sahil",
      "Cold",
      "Medicine"
    );

    const count = await healthcare.getRecordCount(owner.address);
    expect(count).to.equal(1);
  });

  it("Unauthorized user cannot add record", async function () {
    await expect(
      healthcare.connect(randomUser).addRecord(
        owner.address,
        "Hack",
        "Fake",
        "Nothing"
      )
    ).to.be.reverted;
  });

});
