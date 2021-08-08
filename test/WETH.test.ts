import { expect } from "chai";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { defaultAbiCoder, hexlify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { waffle } from "hardhat";
import WPOPArtifact from "../artifacts/contracts/WPOP.sol/WPOP.json";
import { WPOP } from "../typechain/WPOP";
import { expandTo18Decimals } from "./shared/utils/number";
import { getERC20ApprovalDigest } from "./shared/utils/standard";

const { deployContract } = waffle;

describe("WPOP", () => {
    let wpop: WPOP;

    const provider = waffle.provider;
    const [admin, other] = provider.getWallets();

    const name = "Wrapped POP";
    const symbol = "WPOP";
    const version = "1";

    beforeEach(async () => {
        wpop = await deployContract(
            admin,
            WPOPArtifact,
            []
        ) as WPOP;
    })

    context("new WPOP", async () => {
        it("has given data", async () => {
            expect(await wpop.totalSupply()).to.be.equal(0)
            expect(await wpop.name()).to.be.equal(name)
            expect(await wpop.symbol()).to.be.equal(symbol)
            expect(await wpop.decimals()).to.be.equal(18)
            expect(await wpop.version()).to.be.equal(version)
        })

        it("check the deployer balance", async () => {
            expect(await wpop.balanceOf(admin.address)).to.be.equal(0)
        })

        it("deposit", async () => {
            await wpop.deposit({ value: 100 });
            expect(await wpop.balanceOf(admin.address)).to.be.equal(100)
            expect(await provider.getBalance(wpop.address)).to.be.equal(100)
        })

        it("deposit eth", async () => {
            await admin.sendTransaction({ to: wpop.address, value: 100 });
            expect(await wpop.balanceOf(admin.address)).to.be.equal(100)
            expect(await provider.getBalance(wpop.address)).to.be.equal(100)
        })

        it("withdraw", async () => {
            await wpop.deposit({ value: 100 });
            expect(await wpop.balanceOf(admin.address)).to.be.equal(100)
            expect(await provider.getBalance(wpop.address)).to.be.equal(100)
            await wpop.withdraw(100);
            expect(await wpop.balanceOf(admin.address)).to.be.equal(0)
            expect(await provider.getBalance(wpop.address)).to.be.equal(0)
        })

        it("withdraw eth", async () => {
            await admin.sendTransaction({ to: wpop.address, value: 100 });
            expect(await wpop.balanceOf(admin.address)).to.be.equal(100)
            expect(await provider.getBalance(wpop.address)).to.be.equal(100)
            await wpop.withdraw(100);
            expect(await wpop.balanceOf(admin.address)).to.be.equal(0)
            expect(await provider.getBalance(wpop.address)).to.be.equal(0)
        })

        it("data for permit", async () => {
            expect(await wpop.DOMAIN_SEPARATOR()).to.eq(
                keccak256(
                    defaultAbiCoder.encode(
                        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
                        [
                            keccak256(
                                toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
                            ),
                            keccak256(toUtf8Bytes(name)),
                            keccak256(toUtf8Bytes(version)),
                            31337,
                            wpop.address
                        ]
                    )
                )
            )
            expect(await wpop.PERMIT_TYPEHASH()).to.eq(
                keccak256(toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"))
            )
        })

        it("permit", async () => {
            const value = expandTo18Decimals(10)

            const nonce = await wpop.nonces(admin.address)
            const deadline = constants.MaxUint256
            const digest = await getERC20ApprovalDigest(
                wpop,
                { owner: admin.address, spender: other.address, value },
                nonce,
                deadline
            )

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(wpop.permit(admin.address, other.address, value, deadline, v, hexlify(r), hexlify(s)))
                .to.emit(wpop, "Approval")
                .withArgs(admin.address, other.address, value)
            expect(await wpop.allowance(admin.address, other.address)).to.eq(value)
            expect(await wpop.nonces(admin.address)).to.eq(BigNumber.from(1))
        })
    })
})