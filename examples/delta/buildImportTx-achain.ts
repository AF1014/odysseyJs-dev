import "dotenv/config"
import { Odyssey, BN, Buffer } from "../../src"
import { ALPHAAPI, KeyChain as ALPHAKeyChain } from "../../src/apis/alpha"
import {
  DELTAAPI,
  KeyChain as DELTAKeyChain,
  UnsignedTx,
  Tx,
  UTXOSet
} from "../../src/apis/delta"
import {
  DefaultLocalGenesisPrivateKey,
  Defaults,
  costImportTx
} from "../../src/utils"

const ip = process.env.IP
const port = Number(process.env.PORT)
const protocol = process.env.PROTOCOL
const networkID = Number(process.env.NETWORK_ID)
const odyssey: Odyssey = new Odyssey(ip, port, protocol, networkID)
const achain: ALPHAAPI = odyssey.AChain()
const dchain: DELTAAPI = odyssey.DChain()
const aKeychain: ALPHAKeyChain = achain.keyChain()
const dHexAddress: string = "0x7C6689B86B66c462a6F668Ac99Aa9CBf7bfE9fAf"
const key = "7b0bb24b8d95ae393c95ef59d8704b22de7a85016dae49116fc24da5033c7d9d"
const privKey: Buffer = new Buffer(key, "hex")
const dKeychain: DELTAKeyChain = dchain.keyChain()
aKeychain.importKey(privKey)
dKeychain.importKey(privKey)
const dAddressStrings: string[] = dchain.keyChain().getAddressStrings()
const aChainBlockchainId: string = Defaults.network[networkID].A.blockchainID

const main = async (): Promise<any> => {
  const baseFeeResponse: string = await dchain.getBaseFee()
  const baseFee = new BN(parseInt(baseFeeResponse, 16) / 1e9).add(new BN(1))
  let fee: BN = baseFee
  const deltaUTXOResponse: any = await dchain.getUTXOs(
    dAddressStrings,
    aChainBlockchainId
  )
  const utxoSet: UTXOSet = deltaUTXOResponse.utxos
  let unsignedTx: UnsignedTx = await dchain.buildImportTx(
    utxoSet,
    dHexAddress,
    dAddressStrings,
    aChainBlockchainId,
    dAddressStrings,
    fee
  )
  const importCost: number = costImportTx(unsignedTx)
  fee = baseFee.mul(new BN(importCost))
  console.log(fee.toString())
  console.log(baseFee.toString())
  // fee = new BN(30000000000)
  unsignedTx = await dchain.buildImportTx(
    utxoSet,
    dHexAddress,
    dAddressStrings,
    aChainBlockchainId,
    dAddressStrings,
    fee
  )

  const tx: Tx = unsignedTx.sign(dKeychain)
  const txid: string = await dchain.issueTx(tx)
  console.log(`Success! TXID: ${txid}`)
}

main()
