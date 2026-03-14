async function main() {
  const Healthcare = await ethers.getContractFactory("Healthcare");
  const healthcare = await Healthcare.deploy();

  await healthcare.waitForDeployment();

  console.log("Healthcare Contract Deployed to:", await healthcare.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
