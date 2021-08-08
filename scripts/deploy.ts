import hardhat from "hardhat";

async function main() {
    console.log("deploy start")

    const WPOP = await hardhat.ethers.getContractFactory("WPOP")
    const wpop = await WPOP.deploy()
    console.log(`WPOP address: ${wpop.address}`)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
