import "dotenv/config"
import { Odyssey, Buffer, BinTools } from "../../src"
import { ALPHAAPI } from "../../src/apis/alpha"

const ip = process.env.LOCAL_IP
const port = Number(process.env.LOCAL_PORT)
const protocol = process.env.LOCAL_PROTOCOL
const networkID = Number(process.env.LOCAL_NETWORK_ID)
const odyssey: Odyssey = new Odyssey(ip, port, protocol, networkID)
const achain: ALPHAAPI = odyssey.AChain()

const bintools: BinTools = BinTools.getInstance()

const main = async (): Promise<any> => {
  const assetID: Buffer = await achain.getDIONEAssetID()
  console.log(bintools.cb58Encode(assetID))
}

main()
