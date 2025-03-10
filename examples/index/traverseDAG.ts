import "dotenv/config"
import { Odyssey, Buffer } from "../../src"
import { Vertex } from "../../src/apis/alpha"
import { IndexAPI } from "../../src/apis/index"
import {
  GetContainerByIndexResponse,
  GetLastAcceptedResponse
} from "../../src/apis/index/interfaces"

const ip = process.env.IP_INDEXER
const port = Number(process.env.PORT)
const protocol = process.env.PROTOCOL
const networkID = Number(process.env.NETWORK_ID)
const odyssey: Odyssey = new Odyssey(ip, port, protocol, networkID)
const index: IndexAPI = odyssey.Index()

const sleep = (ms: number): Promise<unknown> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
const mstimeout: number = 1000

const main = async (): Promise<any> => {
  const encoding: string = "hex"
  const baseurl: string = "/ext/index/A/vtx"
  const lastAccepted: GetLastAcceptedResponse = await index.getLastAccepted(
    encoding,
    baseurl
  )
  console.log("LAST ACCEPTED", lastAccepted)

  await sleep(mstimeout)

  let idx: string = (parseInt(lastAccepted.index) - 1).toString()
  while (parseInt(idx) >= 1) {
    const containerByIndex: GetContainerByIndexResponse =
      await index.getContainerByIndex(idx, encoding, baseurl)
    console.log(`CONTAINER BY INDEX: ${idx}`, containerByIndex)
    idx = (parseInt(containerByIndex.index) - 1).toString()

    const buffer: Buffer = new Buffer(containerByIndex.bytes.slice(2), "hex")
    // console.log(buffer)
    const vertex: Vertex = new Vertex()
    vertex.fromBuffer(buffer)
    // const b: Buffer = vertex.toBuffer()
    // console.log(b.toString("hex"))
    console.log(vertex)
    console.log("-------------")
  }
}

main()
