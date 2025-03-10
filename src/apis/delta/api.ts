/**
 * @packageDocumentation
 * @module API-DELTA
 */

import { Buffer } from "buffer/"
import BN from "bn.js"
import OdysseyCore from "../../odyssey"
import { JRPCAPI } from "../../common/jrpcapi"
import { RequestResponseData } from "../../common/apibase"
import BinTools from "../../utils/bintools"
import { UTXOSet, UTXO } from "./utxos"
import { KeyChain } from "./keychain"
import { Defaults, PrimaryAssetAlias } from "../../utils/constants"
import { Tx, UnsignedTx } from "./tx"
import { DELTAConstants } from "./constants"
import {
  Asset,
  Index,
  IssueTxParams,
  UTXOResponse
} from "./../../common/interfaces"
import { DELTAInput } from "./inputs"
import { SECPTransferOutput, TransferableOutput } from "./outputs"
import { ExportTx } from "./exporttx"
import {
  TransactionError,
  ChainIdError,
  NoAtomicUTXOsError,
  AddressError
} from "../../utils/errors"
import { Serialization, SerializedType } from "../../utils"
import {
  ExportDIONEParams,
  ExportKeyParams,
  ExportParams,
  GetAtomicTxParams,
  GetAssetDescriptionParams,
  GetAtomicTxStatusParams,
  GetUTXOsParams,
  ImportDIONEParams,
  ImportKeyParams,
  ImportParams
} from "./interfaces"

/**
 * @ignore
 */
const bintools: BinTools = BinTools.getInstance()
const serialization: Serialization = Serialization.getInstance()

/**
 * Class for interacting with a node's DELTAAPI
 *
 * @category RPCAPIs
 *
 * @remarks This extends the [[JRPCAPI]] class. This class should not be directly called. Instead, use the [[Odyssey.addAPI]] function to register this interface with Odyssey.
 */
export class DELTAAPI extends JRPCAPI {
  /**
   * @ignore
   */
  protected keychain: KeyChain = new KeyChain("", "")
  protected blockchainID: string = ""
  protected blockchainAlias: string = undefined
  protected DIONEAssetID: Buffer = undefined
  protected txFee: BN = undefined

  /**
   * Gets the alias for the blockchainID if it exists, otherwise returns `undefined`.
   *
   * @returns The alias for the blockchainID
   */
  getBlockchainAlias = (): string => {
    if (typeof this.blockchainAlias === "undefined") {
      const netID: number = this.core.getNetworkID()
      if (
        netID in Defaults.network &&
        this.blockchainID in Defaults.network[`${netID}`]
      ) {
        this.blockchainAlias =
          Defaults.network[`${netID}`][this.blockchainID]["alias"]
        return this.blockchainAlias
      } else {
        /* istanbul ignore next */
        return undefined
      }
    }
    return this.blockchainAlias
  }

  /**
   * Sets the alias for the blockchainID.
   *
   * @param alias The alias for the blockchainID.
   *
   */
  setBlockchainAlias = (alias: string): string => {
    this.blockchainAlias = alias
    /* istanbul ignore next */
    return undefined
  }

  /**
   * Gets the blockchainID and returns it.
   *
   * @returns The blockchainID
   */
  getBlockchainID = (): string => this.blockchainID

  /**
   * Refresh blockchainID, and if a blockchainID is passed in, use that.
   *
   * @param Optional. BlockchainID to assign, if none, uses the default based on networkID.
   *
   * @returns A boolean if the blockchainID was successfully refreshed.
   */
  refreshBlockchainID = (blockchainID: string = undefined): boolean => {
    const netID: number = this.core.getNetworkID()
    if (
      typeof blockchainID === "undefined" &&
      typeof Defaults.network[`${netID}`] !== "undefined"
    ) {
      this.blockchainID = Defaults.network[`${netID}`].D.blockchainID //default to D-Chain
      return true
    }

    if (typeof blockchainID === "string") {
      this.blockchainID = blockchainID
      return true
    }

    return false
  }

  /**
   * Takes an address string and returns its {@link https://github.com/feross/buffer|Buffer} representation if valid.
   *
   * @returns A {@link https://github.com/feross/buffer|Buffer} for the address if valid, undefined if not valid.
   */
  parseAddress = (addr: string): Buffer => {
    const alias: string = this.getBlockchainAlias()
    const blockchainID: string = this.getBlockchainID()
    return bintools.parseAddress(
      addr,
      blockchainID,
      alias,
      DELTAConstants.ADDRESSLENGTH
    )
  }

  addressFromBuffer = (address: Buffer): string => {
    const chainID: string = this.getBlockchainAlias()
      ? this.getBlockchainAlias()
      : this.getBlockchainID()
    const type: SerializedType = "bech32"
    return serialization.bufferToType(
      address,
      type,
      this.core.getHRP(),
      chainID
    )
  }

  /**
   * Retrieves an assets name and symbol.
   *
   * @param assetID Either a {@link https://github.com/feross/buffer|Buffer} or an b58 serialized string for the AssetID or its alias.
   *
   * @returns Returns a Promise Asset with keys "name", "symbol", "assetID" and "denomination".
   */
  getAssetDescription = async (assetID: Buffer | string): Promise<any> => {
    let asset: string
    if (typeof assetID !== "string") {
      asset = bintools.cb58Encode(assetID)
    } else {
      asset = assetID
    }

    const params: GetAssetDescriptionParams = {
      assetID: asset
    }

    const tmpBaseURL: string = this.getBaseURL()

    // set base url to get asset description
    this.setBaseURL("/ext/bc/A")
    const response: RequestResponseData = await this.callMethod(
      "alpha.getAssetDescription",
      params
    )

    // set base url back what it originally was
    this.setBaseURL(tmpBaseURL)
    return {
      name: response.data.result.name,
      symbol: response.data.result.symbol,
      assetID: bintools.cb58Decode(response.data.result.assetID),
      denomination: parseInt(response.data.result.denomination, 10)
    }
  }

  /**
   * Fetches the DIONE AssetID and returns it in a Promise.
   *
   * @param refresh This function caches the response. Refresh = true will bust the cache.
   *
   * @returns The the provided string representing the DIONE AssetID
   */
  getDIONEAssetID = async (refresh: boolean = false): Promise<Buffer> => {
    if (typeof this.DIONEAssetID === "undefined" || refresh) {
      const asset: Asset = await this.getAssetDescription(PrimaryAssetAlias)
      this.DIONEAssetID = asset.assetID
    }
    return this.DIONEAssetID
  }

  /**
   * Overrides the defaults and sets the cache to a specific DIONE AssetID
   *
   * @param dioneAssetID A cb58 string or Buffer representing the DIONE AssetID
   *
   * @returns The the provided string representing the DIONE AssetID
   */
  setDIONEAssetID = (dioneAssetID: string | Buffer) => {
    if (typeof dioneAssetID === "string") {
      dioneAssetID = bintools.cb58Decode(dioneAssetID)
    }
    this.DIONEAssetID = dioneAssetID
  }

  /**
   * Gets the default tx fee for this chain.
   *
   * @returns The default tx fee as a {@link https://github.com/indutny/bn.js/|BN}
   */
  getDefaultTxFee = (): BN => {
    return this.core.getNetworkID() in Defaults.network
      ? new BN(Defaults.network[this.core.getNetworkID()]["D"]["txFee"])
      : new BN(0)
  }

  /**
   * returns the amount of [assetID] for the given address in the state of the given block number.
   * "latest", "pending", and "accepted" meta block numbers are also allowed.
   *
   * @param heaAddress The hex representation of the address
   * @param blockHeight The block height
   * @param assetID The asset ID
   *
   * @returns Returns a Promise object containing the balance
   */
  getAssetBalance = async (
    heaAddress: string,
    blockHeight: string,
    assetID: string
  ): Promise<object> => {
    const params: string[] = [heaAddress, blockHeight, assetID]

    const method: string = "eth_getAssetBalance"
    const path: string = "ext/bc/D/rpc"
    const response: RequestResponseData = await this.callMethod(
      method,
      params,
      path
    )
    return response.data
  }

  /**
   * Returns the status of a provided atomic transaction ID by calling the node's `getAtomicTxStatus` method.
   *
   * @param txID The string representation of the transaction ID
   *
   * @returns Returns a Promise string containing the status retrieved from the node
   */
  getAtomicTxStatus = async (txID: string): Promise<string> => {
    const params: GetAtomicTxStatusParams = {
      txID
    }

    const response: RequestResponseData = await this.callMethod(
      "dione.getAtomicTxStatus",
      params
    )
    return response.data.result.status
      ? response.data.result.status
      : response.data.result
  }

  /**
   * Returns the transaction data of a provided transaction ID by calling the node's `getAtomicTx` method.
   *
   * @param txID The string representation of the transaction ID
   *
   * @returns Returns a Promise string containing the bytes retrieved from the node
   */
  getAtomicTx = async (txID: string): Promise<string> => {
    const params: GetAtomicTxParams = {
      txID
    }

    const response: RequestResponseData = await this.callMethod(
      "dione.getAtomicTx",
      params
    )
    return response.data.result.tx
  }

  /**
   * Gets the tx fee for this chain.
   *
   * @returns The tx fee as a {@link https://github.com/indutny/bn.js/|BN}
   */
  getTxFee = (): BN => {
    if (typeof this.txFee === "undefined") {
      this.txFee = this.getDefaultTxFee()
    }
    return this.txFee
  }

  /**
   * Send ANT (Odyssey Native Token) assets including DIONE from the D-Chain to an account on the A-Chain.
   *
   * After calling this method, you must call the A-Chain’s import method to complete the transfer.
   *
   * @param username The Keystore user that controls the A-Chain account specified in `to`
   * @param password The password of the Keystore user
   * @param to The account on the A-Chain to send the DIONE to.
   * @param amount Amount of asset to export as a {@link https://github.com/indutny/bn.js/|BN}
   * @param assetID The asset id which is being sent
   *
   * @returns String representing the transaction id
   */
  export = async (
    username: string,
    password: string,
    to: string,
    amount: BN,
    assetID: string
  ): Promise<string> => {
    const params: ExportParams = {
      to,
      amount: amount.toString(10),
      username,
      password,
      assetID
    }
    const response: RequestResponseData = await this.callMethod(
      "dione.export",
      params
    )
    return response.data.result.txID
      ? response.data.result.txID
      : response.data.result
  }

  /**
   * Send DIONE from the D-Chain to an account on the A-Chain.
   *
   * After calling this method, you must call the A-Chain’s importDIONE method to complete the transfer.
   *
   * @param username The Keystore user that controls the A-Chain account specified in `to`
   * @param password The password of the Keystore user
   * @param to The account on the A-Chain to send the DIONE to.
   * @param amount Amount of DIONE to export as a {@link https://github.com/indutny/bn.js/|BN}
   *
   * @returns String representing the transaction id
   */
  exportDIONE = async (
    username: string,
    password: string,
    to: string,
    amount: BN
  ): Promise<string> => {
    const params: ExportDIONEParams = {
      to,
      amount: amount.toString(10),
      username,
      password
    }
    const response: RequestResponseData = await this.callMethod(
      "dione.exportDIONE",
      params
    )
    return response.data.result.txID
      ? response.data.result.txID
      : response.data.result
  }

  /**
   * Retrieves the UTXOs related to the addresses provided from the node's `getUTXOs` method.
   *
   * @param addresses An array of addresses as cb58 strings or addresses as {@link https://github.com/feross/buffer|Buffer}s
   * @param sourceChain A string for the chain to look for the UTXO's. Default is to use this chain, but if exported UTXOs exist
   * from other chains, this can used to pull them instead.
   * @param limit Optional. Returns at most [limit] addresses. If [limit] == 0 or > [maxUTXOsToFetch], fetches up to [maxUTXOsToFetch].
   * @param startIndex Optional. [StartIndex] defines where to start fetching UTXOs (for pagination.)
   * UTXOs fetched are from addresses equal to or greater than [StartIndex.Address]
   * For address [StartIndex.Address], only UTXOs with IDs greater than [StartIndex.Utxo] will be returned.
   */
  getUTXOs = async (
    addresses: string[] | string,
    sourceChain: string = undefined,
    limit: number = 0,
    startIndex: Index = undefined,
    encoding: string = "hex"
  ): Promise<{
    numFetched: number
    utxos
    endIndex: Index
  }> => {
    if (typeof addresses === "string") {
      addresses = [addresses]
    }

    const params: GetUTXOsParams = {
      addresses: addresses,
      limit,
      encoding
    }
    if (typeof startIndex !== "undefined" && startIndex) {
      params.startIndex = startIndex
    }

    if (typeof sourceChain !== "undefined") {
      params.sourceChain = sourceChain
    }

    const response: RequestResponseData = await this.callMethod(
      "dione.getUTXOs",
      params
    )
    const utxos: UTXOSet = new UTXOSet()
    const data: any = response.data.result.utxos
    if (data.length > 0 && data[0].substring(0, 2) === "0x") {
      const cb58Strs: string[] = []
      data.forEach((str: string): void => {
        cb58Strs.push(bintools.cb58Encode(new Buffer(str.slice(2), "hex")))
      })

      utxos.addArray(cb58Strs, false)
    } else {
      utxos.addArray(data, false)
    }
    response.data.result.utxos = utxos
    return response.data.result
  }

  /**
   * Send ANT (Odyssey Native Token) assets including DIONE from an account on the A-Chain to an address on the D-Chain. This transaction
   * must be signed with the key of the account that the asset is sent from and which pays
   * the transaction fee.
   *
   * @param username The Keystore user that controls the account specified in `to`
   * @param password The password of the Keystore user
   * @param to The address of the account the asset is sent to.
   * @param sourceChain The chainID where the funds are coming from. Ex: "A"
   *
   * @returns Promise for a string for the transaction, which should be sent to the network
   * by calling issueTx.
   */
  import = async (
    username: string,
    password: string,
    to: string,
    sourceChain: string
  ): Promise<string> => {
    const params: ImportParams = {
      to,
      sourceChain,
      username,
      password
    }
    const response: RequestResponseData = await this.callMethod(
      "dione.import",
      params
    )
    return response.data.result.txID
      ? response.data.result.txID
      : response.data.result
  }

  /**
   * Send DIONE from an account on the A-Chain to an address on the D-Chain. This transaction
   * must be signed with the key of the account that the DIONE is sent from and which pays
   * the transaction fee.
   *
   * @param username The Keystore user that controls the account specified in `to`
   * @param password The password of the Keystore user
   * @param to The address of the account the DIONE is sent to. This must be the same as the to
   * argument in the corresponding call to the A-Chain’s exportDIONE
   * @param sourceChain The chainID where the funds are coming from.
   *
   * @returns Promise for a string for the transaction, which should be sent to the network
   * by calling issueTx.
   */
  importDIONE = async (
    username: string,
    password: string,
    to: string,
    sourceChain: string
  ): Promise<string> => {
    const params: ImportDIONEParams = {
      to,
      sourceChain,
      username,
      password
    }
    const response: RequestResponseData = await this.callMethod(
      "dione.importDIONE",
      params
    )
    return response.data.result.txID
      ? response.data.result.txID
      : response.data.result
  }

  /**
   * Give a user control over an address by providing the private key that controls the address.
   *
   * @param username The name of the user to store the private key
   * @param password The password that unlocks the user
   * @param privateKey A string representing the private key in the vm"s format
   *
   * @returns The address for the imported private key.
   */
  importKey = async (
    username: string,
    password: string,
    privateKey: string
  ): Promise<string> => {
    const params: ImportKeyParams = {
      username,
      password,
      privateKey
    }
    const response: RequestResponseData = await this.callMethod(
      "dione.importKey",
      params
    )
    return response.data.result.address
      ? response.data.result.address
      : response.data.result
  }

  /**
   * Calls the node's issueTx method from the API and returns the resulting transaction ID as a string.
   *
   * @param tx A string, {@link https://github.com/feross/buffer|Buffer}, or [[Tx]] representing a transaction
   *
   * @returns A Promise string representing the transaction ID of the posted transaction.
   */
  issueTx = async (tx: string | Buffer | Tx): Promise<string> => {
    let Transaction: string = ""
    if (typeof tx === "string") {
      Transaction = tx
    } else if (tx instanceof Buffer) {
      const txobj: Tx = new Tx()
      txobj.fromBuffer(tx)
      Transaction = txobj.toStringHex()
    } else if (tx instanceof Tx) {
      Transaction = tx.toStringHex()
    } else {
      /* istanbul ignore next */
      throw new TransactionError(
        "Error - dione.issueTx: provided tx is not expected type of string, Buffer, or Tx"
      )
    }
    const params: IssueTxParams = {
      tx: Transaction.toString(),
      encoding: "hex"
    }
    const response: RequestResponseData = await this.callMethod(
      "dione.issueTx",
      params
    )
    return response.data.result.txID
      ? response.data.result.txID
      : response.data.result
  }

  /**
   * Exports the private key for an address.
   *
   * @param username The name of the user with the private key
   * @param password The password used to decrypt the private key
   * @param address The address whose private key should be exported
   *
   * @returns Promise with the decrypted private key and private key hex as store in the database
   */
  exportKey = async (
    username: string,
    password: string,
    address: string
  ): Promise<object> => {
    const params: ExportKeyParams = {
      username,
      password,
      address
    }
    const response: RequestResponseData = await this.callMethod(
      "dione.exportKey",
      params
    )
    return response.data.result
  }

  /**
   * Helper function which creates an unsigned Import Tx. For more granular control, you may create your own
   * [[UnsignedTx]] manually (with their corresponding [[TransferableInput]]s, [[TransferableOutput]]s).
   *
   * @param utxoset A set of UTXOs that the transaction is built on
   * @param toAddress The address to send the funds
   * @param ownerAddresses The addresses being used to import
   * @param sourceChain The chainid for where the import is coming from
   * @param fromAddresses The addresses being used to send the funds from the UTXOs provided
   *
   * @returns An unsigned transaction ([[UnsignedTx]]) which contains a [[ImportTx]].
   *
   * @remarks
   * This helper exists because the endpoint API should be the primary point of entry for most functionality.
   */
  buildImportTx = async (
    utxoset: UTXOSet,
    toAddress: string,
    ownerAddresses: string[],
    sourceChain: Buffer | string,
    fromAddresses: string[],
    fee: BN = new BN(0)
  ): Promise<UnsignedTx> => {
    const from: Buffer[] = this._cleanAddressArray(
      fromAddresses,
      "buildImportTx"
    ).map((a: string): Buffer => bintools.stringToAddress(a))
    let srdChain: string = undefined

    if (typeof sourceChain === "string") {
      // if there is a sourceChain passed in and it's a string then save the string value and cast the original
      // variable from a string to a Buffer
      srdChain = sourceChain
      sourceChain = bintools.cb58Decode(sourceChain)
    } else if (
      typeof sourceChain === "undefined" ||
      !(sourceChain instanceof Buffer)
    ) {
      // if there is no sourceChain passed in or the sourceChain is any data type other than a Buffer then throw an error
      throw new ChainIdError(
        "Error - DELTAAPI.buildImportTx: sourceChain is undefined or invalid sourceChain type."
      )
    }
    const utxoResponse: UTXOResponse = await this.getUTXOs(
      ownerAddresses,
      srdChain,
      0,
      undefined
    )
    const atomicUTXOs: UTXOSet = utxoResponse.utxos
    const networkID: number = this.core.getNetworkID()
    const dioneAssetID: string = Defaults.network[`${networkID}`].A.dioneAssetID
    const dioneAssetIDBuf: Buffer = bintools.cb58Decode(dioneAssetID)
    const atomics: UTXO[] = atomicUTXOs.getAllUTXOs()

    if (atomics.length === 0) {
      throw new NoAtomicUTXOsError(
        "Error - DELTAAPI.buildImportTx: no atomic utxos to import"
      )
    }

    const builtUnsignedTx: UnsignedTx = utxoset.buildImportTx(
      networkID,
      bintools.cb58Decode(this.blockchainID),
      toAddress,
      atomics,
      sourceChain,
      fee,
      dioneAssetIDBuf
    )

    return builtUnsignedTx
  }

  /**
   * Helper function which creates an unsigned Export Tx. For more granular control, you may create your own
   * [[UnsignedTx]] manually (with their corresponding [[TransferableInput]]s, [[TransferableOutput]]s).
   *
   * @param amount The amount being exported as a {@link https://github.com/indutny/bn.js/|BN}
   * @param assetID The asset id which is being sent
   * @param destinationChain The chainid for where the assets will be sent.
   * @param toAddresses The addresses to send the funds
   * @param fromAddresses The addresses being used to send the funds from the UTXOs provided
   * @param changeAddresses The addresses that can spend the change remaining from the spent UTXOs
   * @param asOf Optional. The timestamp to verify the transaction against as a {@link https://github.com/indutny/bn.js/|BN}
   * @param locktime Optional. The locktime field created in the resulting outputs
   * @param threshold Optional. The number of signatures required to spend the funds in the resultant UTXO
   *
   * @returns An unsigned transaction ([[UnsignedTx]]) which contains an [[ExportTx]].
   */
  buildExportTx = async (
    amount: BN,
    assetID: Buffer | string,
    destinationChain: Buffer | string,
    fromAddressHex: string,
    fromAddressBech: string,
    toAddresses: string[],
    nonce: number = 0,
    locktime: BN = new BN(0),
    threshold: number = 1,
    fee: BN = new BN(0)
  ): Promise<UnsignedTx> => {
    const prefixes: object = {}
    toAddresses.map((address: string) => {
      prefixes[address.split("-")[0]] = true
    })
    if (Object.keys(prefixes).length !== 1) {
      throw new AddressError(
        "Error - DELTAAPI.buildExportTx: To addresses must have the same chainID prefix."
      )
    }

    if (typeof destinationChain === "undefined") {
      throw new ChainIdError(
        "Error - DELTAAPI.buildExportTx: Destination ChainID is undefined."
      )
    } else if (typeof destinationChain === "string") {
      destinationChain = bintools.cb58Decode(destinationChain)
    } else if (!(destinationChain instanceof Buffer)) {
      throw new ChainIdError(
        "Error - DELTAAPI.buildExportTx: Invalid destinationChain type"
      )
    }
    if (destinationChain.length !== 32) {
      throw new ChainIdError(
        "Error - DELTAAPI.buildExportTx: Destination ChainID must be 32 bytes in length."
      )
    }
    const assetDescription: any = await this.getAssetDescription("DIONE")
    let deltaInputs: DELTAInput[] = []
    if (bintools.cb58Encode(assetDescription.assetID) === assetID) {
      const deltaInput: DELTAInput = new DELTAInput(
        fromAddressHex,
        amount.add(fee),
        assetID,
        nonce
      )
      deltaInput.addSignatureIdx(0, bintools.stringToAddress(fromAddressBech))
      deltaInputs.push(deltaInput)
    } else {
      // if asset id isn't DIONE asset id then create 2 inputs
      // first input will be DIONE and will be for the amount of the fee
      // second input will be the ANT
      const deltaDIONEInput: DELTAInput = new DELTAInput(
        fromAddressHex,
        fee,
        assetDescription.assetID,
        nonce
      )
      deltaDIONEInput.addSignatureIdx(
        0,
        bintools.stringToAddress(fromAddressBech)
      )
      deltaInputs.push(deltaDIONEInput)

      const deltaANTInput: DELTAInput = new DELTAInput(
        fromAddressHex,
        amount,
        assetID,
        nonce
      )
      deltaANTInput.addSignatureIdx(
        0,
        bintools.stringToAddress(fromAddressBech)
      )
      deltaInputs.push(deltaANTInput)
    }

    const to: Buffer[] = []
    toAddresses.map((address: string): void => {
      to.push(bintools.stringToAddress(address))
    })

    let exportedOuts: TransferableOutput[] = []
    const secpTransferOutput: SECPTransferOutput = new SECPTransferOutput(
      amount,
      to,
      locktime,
      threshold
    )
    const transferableOutput: TransferableOutput = new TransferableOutput(
      bintools.cb58Decode(assetID),
      secpTransferOutput
    )
    exportedOuts.push(transferableOutput)

    // lexicographically sort ins and outs
    deltaInputs = deltaInputs.sort(DELTAInput.comparator())
    exportedOuts = exportedOuts.sort(TransferableOutput.comparator())

    const exportTx: ExportTx = new ExportTx(
      this.core.getNetworkID(),
      bintools.cb58Decode(this.blockchainID),
      destinationChain,
      deltaInputs,
      exportedOuts
    )

    const unsignedTx: UnsignedTx = new UnsignedTx(exportTx)
    return unsignedTx
  }

  /**
   * Gets a reference to the keychain for this class.
   *
   * @returns The instance of [[KeyChain]] for this class
   */
  keyChain = (): KeyChain => this.keychain

  /**
   *
   * @returns new instance of [[KeyChain]]
   */
  newKeyChain = (): KeyChain => {
    // warning, overwrites the old keychain
    const alias = this.getBlockchainAlias()
    if (alias) {
      this.keychain = new KeyChain(this.core.getHRP(), alias)
    } else {
      this.keychain = new KeyChain(this.core.getHRP(), this.blockchainID)
    }
    return this.keychain
  }

  /**
   * @ignore
   */
  protected _cleanAddressArray(
    addresses: string[] | Buffer[],
    caller: string
  ): string[] {
    const addrs: string[] = []
    const chainid: string = this.getBlockchainAlias()
      ? this.getBlockchainAlias()
      : this.getBlockchainID()
    if (addresses && addresses.length > 0) {
      addresses.forEach((address: string | Buffer) => {
        if (typeof address === "string") {
          if (typeof this.parseAddress(address as string) === "undefined") {
            /* istanbul ignore next */
            throw new AddressError("Error - Invalid address format")
          }
          addrs.push(address as string)
        } else {
          const type: SerializedType = "bech32"
          addrs.push(
            serialization.bufferToType(
              address as Buffer,
              type,
              this.core.getHRP(),
              chainid
            )
          )
        }
      })
    }
    return addrs
  }

  /**
   * This class should not be instantiated directly.
   * Instead use the [[Odyssey.addAPI]] method.
   *
   * @param core A reference to the Odyssey class
   * @param baseURL Defaults to the string "/ext/bc/D/dione" as the path to blockchain's baseURL
   * @param blockchainID The Blockchain's ID. Defaults to an empty string: ""
   */
  constructor(
    core: OdysseyCore,
    baseURL: string = "/ext/bc/D/dione",
    blockchainID: string = ""
  ) {
    super(core, baseURL)
    this.blockchainID = blockchainID
    const netID: number = core.getNetworkID()
    if (
      netID in Defaults.network &&
      blockchainID in Defaults.network[`${netID}`]
    ) {
      const alias: string =
        Defaults.network[`${netID}`][`${blockchainID}`]["alias"]
      this.keychain = new KeyChain(this.core.getHRP(), alias)
    } else {
      this.keychain = new KeyChain(this.core.getHRP(), blockchainID)
    }
  }

  /**
   * @returns a Promise string containing the base fee for the next block.
   */
  getBaseFee = async (): Promise<string> => {
    const params: string[] = []
    const method: string = "eth_baseFee"
    const path: string = "ext/bc/D/rpc"
    const response: RequestResponseData = await this.callMethod(
      method,
      params,
      path
    )
    return response.data.result
  }

  /**
   * returns the priority fee needed to be included in a block.
   *
   * @returns Returns a Promise string containing the priority fee needed to be included in a block.
   */
  getMaxPriorityFeePerGas = async (): Promise<string> => {
    const params: string[] = []

    const method: string = "eth_maxPriorityFeePerGas"
    const path: string = "ext/bc/D/rpc"
    const response: RequestResponseData = await this.callMethod(
      method,
      params,
      path
    )
    return response.data.result
  }
}
