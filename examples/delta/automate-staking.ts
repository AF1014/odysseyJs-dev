import "dotenv/config"
import { Odyssey, BN, Buffer } from "../../src"
import { InfoAPI } from "../../src/apis/info"
import {
  OmegaVMAPI,
  KeyChain as OmegaKeyChain
} from "../../src/apis/omegavm"
import {
  DELTAAPI,
  KeyChain as DELTAKeyChain,
  UnsignedTx,
  Tx
} from "../../src/apis/delta"
import { ALPHAAPI } from "../../src/apis/alpha"
import { Web3 } from "web3"
import {
  DefaultLocalGenesisPrivateKey,
  Defaults,
  costExportTx
} from "../../src/utils"

const ip = process.env.IP
const port = Number(process.env.PORT)
const protocol = process.env.PROTOCOL
const networkID = Number(process.env.NETWORK_ID)
const odyssey: Odyssey = new Odyssey(ip, port, protocol, networkID)
const key = process.env.PRIVATE_KEY1 ?? ""
const path: string = "/ext/bc/D/rpc"
const web3 = new Web3(`${protocol}://${ip}:${port}${path}`)
const privKey: Buffer = new Buffer(key, "hex")
const achain: ALPHAAPI = odyssey.AChain()
const ochain: OmegaVMAPI = odyssey.OChain()
const dchain: DELTAAPI = odyssey.DChain()
const aKeychain = achain.keyChain()
const oKeychain = ochain.keyChain()
const dKeychain = dchain.keyChain()

aKeychain.importKey(privKey)
oKeychain.importKey(privKey)
dKeychain.importKey(privKey)

// export tx file variables
const oAddressStrings: string[] = ochain.keyChain().getAddressStrings()
console.log(Defaults.network[networkID])
const dAddressStrings: string[] = dchain.keyChain().getAddressStrings()
const oChainBlockchainIdStr: string = Defaults.network[networkID].O.blockchainID
const dioneAssetID: string = Defaults.network[networkID].O.dioneAssetID
const d : any = ochain.getDIONEAssetID().then(res=>console.log(res))
console.log("d",d)
console.log('dioneAssetID', dioneAssetID)
const dHexAddress: string = "0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC"
const threshold: number = 1

const main = async (): Promise<any> => {
try{
  const achainAddresses = await aKeychain.getAddressStrings()
  const dchainAddresses = await dKeychain.getAddressStrings()
  const ochainAddresses = await oKeychain.getAddressStrings()
  const dHexAddress = process.env.PUBLIC_KEY1 ?? ""

  console.log(`A Address(${achainAddresses[0]})\nD Address(${dHexAddress})\nO Address(${ochainAddresses[0]})`)

  const abalance = await achain.getBalance(achainAddresses[0], Defaults.network[networkID].A.dioneAssetID ?? "")
  const obalance = await ochain.getBalance(ochainAddresses)
  const txcount = await web3.eth.getTransactionCount(dHexAddress)
  const dbalance = await web3.eth.getBalance(dHexAddress)
  const nonce = Number(txcount)
  
  console.log(`A Balance(${abalance.balance.toString()})\nD Balance(${dbalance.toString()})\nO Balance(${obalance.balance.toString()})`)

  // Check if the staking amount is

  let stakingAmount: BN = new BN(50000000000);
  console.log(`Staking amount is ${stakingAmount.toString()}`);
  console.log("Achain Balance Object:", JSON.stringify(abalance, null, 2));
  console.log("Ochain Balance Object:", JSON.stringify(obalance, null, 2));
  console.log("Dchain Balance Object:", dbalance.toString());

  const totalBalance = new BN(abalance.balance.toString()).add(new BN(obalance.balance.toString()));

} catch(error){
    console.error("Error: ", error)
  }
}
main()