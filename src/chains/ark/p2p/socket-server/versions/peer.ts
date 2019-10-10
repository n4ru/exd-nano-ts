import { app } from "../../../container";
//import { Blockchain, Database, Logger, P2P, TransactionPool } from "../../../interfaces";
import {  Blockchain, Logger, P2P } from "../../../interfaces";
import { isBlockChained } from "../../../core-utils";
import { Crypto, Interfaces } from "@arkecosystem/crypto";
import pluralize from "pluralize";
import { MissingCommonBlockError } from "../../errors";
import { IPeerPingResponse } from "../../interfaces";
import { isWhitelisted } from "../../utils";
import { InvalidTransactionsError, UnchainedBlockError } from "../errors";
import { getPeerConfig } from "../utils/get-peer-config";
import { mapAddr } from "../utils/map-addr";

export const getPeers = ({ service }: { service: P2P.IPeerService }): P2P.IPeerBroadcast[] => {
    return service
        .getStorage()
        .getPeers()
        .map(peer => peer.toBroadcast())
        .sort((a, b) => a.latency - b.latency);
};

export const getCommonBlocks = async ({
    req,
}): Promise<{
    common: Interfaces.IBlockData;
    lastBlockHeight: number;
}> => {
    
    const blockchain: Blockchain.IBlockchain = app.resolvePlugin<Blockchain.IBlockchain>("blockchain");
    /*
    const commonBlocks: Interfaces.IBlockData[] = await blockchain.database.getCommonBlocks(req.data.ids);

    if (!commonBlocks.length) {
        throw new MissingCommonBlockError();
    }

    return {
        common: commonBlocks[0],
        lastBlockHeight: blockchain.getLastBlock().data.height,
    };
    */

    return {
        common: null,
        lastBlockHeight: blockchain.getLastBlock().data.height
    }
};

export const getStatus = async (): Promise<IPeerPingResponse> => {
    const lastBlock: Interfaces.IBlock = app.resolvePlugin<Blockchain.IBlockchain>("blockchain").getLastBlock();
//console.log("SOMEONE IS ASKING MY STATUS AAAAAAAAAA");
    const a = {
        state: {
            height: lastBlock ? lastBlock.data.height : 0,
            forgingAllowed: Crypto.Slots.isForgingAllowed(),
            currentSlot: Crypto.Slots.getSlotNumber(),
            header: lastBlock ? lastBlock.getHeader() : {},
        },
        config: getPeerConfig(), //todo: hide the plugins nano is running to not stand out?
    };
    return a;
};

export const postBlock = async ({ req }): Promise<void> => {
    const blockchain: Blockchain.IBlockchain = app.resolvePlugin<Blockchain.IBlockchain>("blockchain");

    const block: Interfaces.IBlockData = req.data.block;
    const fromForger: boolean = isWhitelisted(app.resolveOptions("p2p").remoteAccess, req.headers.remoteAddress);

    if (!fromForger) {
        if (blockchain.pingBlock(block)) {
            return;
        }

        const lastDownloadedBlock: Interfaces.IBlockData = blockchain.getLastDownloadedBlock();

        if (!isBlockChained(lastDownloadedBlock, block)) {
            throw new UnchainedBlockError(lastDownloadedBlock.height, block.height);
        }
    }

    app.resolvePlugin<Logger.ILogger>("logger").info(
        `Received new block at height ${block.height.toLocaleString()} with ${pluralize(
            "transaction",
            block.numberOfTransactions,
            true,
        )} from ${mapAddr(req.headers.remoteAddress)}`,
    );

    blockchain.handleIncomingBlock(block, fromForger);

};

export const postTransactions = async ({ service, req }: { service: P2P.IPeerService; req }): Promise<string[]> => {
    app.resolvePlugin<Logger.ILogger>("logger").info("POST TXS CALLED");
    return new Promise(res => res(["05126c348536c76f42cc3209e519c523ada925ecab22376cb7c90333bd676964"]));
    /*
    const processor: TransactionPool.IProcessor = app
        .resolvePlugin<TransactionPool.IConnection>("transaction-pool")
        .makeProcessor();

    const result: TransactionPool.IProcessorResult = await processor.validate(req.data.transactions);

    if (result.invalid.length > 0) {
        throw new InvalidTransactionsError();
    }

    if (result.broadcast.length > 0) {
        service.getMonitor().broadcastTransactions(processor.getBroadcastTransactions());
    }

    return result.accept;
    */
};

export const getBlocks = async ({ req }): Promise<Interfaces.IBlockData[]> => {//async ({ req }): Promise<Interfaces.IBlockData[] | Database.IDownloadBlock[]> => {
    return new Promise(res => []);
    /*
    const database: Database.IDatabaseService = app.resolvePlugin<Database.IDatabaseService>("database");

    const reqBlockHeight: number = +req.data.lastBlockHeight + 1;
    const reqBlockLimit: number = +req.data.blockLimit || 400;
    const reqHeadersOnly: boolean = !!req.data.headersOnly;
    const reqSerialized: boolean = !!req.data.serialized; // TODO: remove in 2.6 and only return serialized blocks

    let blocks: Interfaces.IBlockData[] | Database.IDownloadBlock[];
    if (reqSerialized) {
        blocks = await database.getBlocksForDownload(reqBlockHeight, reqBlockLimit, reqHeadersOnly);
    } else {
        blocks = await database.getBlocks(reqBlockHeight, reqBlockLimit, reqHeadersOnly);
    }

    app.resolvePlugin<Logger.ILogger>("logger").info(
        `${mapAddr(req.headers.remoteAddress)} has downloaded ${pluralize(
            "block",
            blocks.length,
            true,
        )} from height ${reqBlockHeight.toLocaleString()}`,
    );

    return blocks || [];
    */
};