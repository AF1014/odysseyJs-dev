import "dotenv/config"
import { Odyssey, BN } from "../../src"
import { OmegaVMAPI } from "../../src/apis/omegavm"

const ip = process.env.LOCAL_IP
const port = Number(process.env.LOCAL_PORT)
const protocol = process.env.LOCAL_PROTOCOL
const networkID = Number(process.env.LOCAL_NETWORK_ID)
const odyssey: Odyssey = new Odyssey(ip, port, protocol, networkID)
const ochain: OmegaVMAPI = odyssey.OChain()

const main = async (): Promise<any> => {
  const currentSupply: BN = await ochain.getCurrentSupply()
  console.log(currentSupply.toString())
}

main()
