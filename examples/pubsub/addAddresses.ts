import { PubSub } from "../../src"

const main = async (): Promise<any> => {
  const pubsub: PubSub = new PubSub()
  const addresses: string[] = ["A-dione1wst8jt3z3fm9ce0z6akj3266zmgccdp03hjlaj"]
  const addAddresses: string = pubsub.addAddresses(addresses)
  console.log(addAddresses)
}

main()
