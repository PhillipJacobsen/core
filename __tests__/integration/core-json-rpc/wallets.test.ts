import "jest-extended";

import { app } from "@arkecosystem/core-container";
import { Peer } from "@arkecosystem/core-p2p/dist/peer";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { sendRequest } from "./__support__/request";
import { setUp, tearDown } from "./__support__/setup";

const axiosMock = new MockAdapter(axios);

jest.mock("is-reachable", () => jest.fn(async peer => true));

let peerMock;

beforeAll(async () => {
    await setUp();

    peerMock = new Peer("1.0.0.99", 4002);
    Object.assign(peerMock, peerMock.headers);

    const monitor = app.resolvePlugin("p2p");
    monitor.peers = {};
    monitor.peers[peerMock.ip] = peerMock;
});

afterAll(async () => {
    await tearDown();
});

beforeEach(async () => {
    axiosMock.onPost(/.*:8080.*/).passThrough();
});

afterEach(async () => {
    axiosMock.reset(); // important: resets any existing mocking behavior
});

describe("Wallets", () => {
    describe("POST wallets.info", () => {
        it("should get information about the given wallet", async () => {
            axiosMock
                .onGet(/.*\/api\/wallets\/AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv/)
                .reply(() => [200, { data: { address: "AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv" } }, peerMock.headers]);

            const response = await sendRequest("wallets.info", {
                address: "AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv",
            });

            expect(response.data.result.address).toBe("AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv");
        });

        it("should fail to get information about the given wallet", async () => {
            axiosMock.onGet(/.*\/api\/wallets\/AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv/).reply(() => [
                404,
                {
                    error: {
                        code: 404,
                        message: "Wallet AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv could not be found.",
                    },
                },
                peerMock.headers,
            ]);

            const response = await sendRequest("wallets.info", {
                address: "AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv",
            });

            expect(response.data.error.code).toBe(404);
            expect(response.data.error.message).toBe("Wallet AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv could not be found.");
        });
    });

    describe("POST wallets.transactions", () => {
        it("should get the transactions for the given wallet", async () => {
            axiosMock
                .onGet(/.*\/api\/transactions/)
                .reply(() => [
                    200,
                    { meta: { totalCount: 2 }, data: [{ id: "123" }, { id: "1234" }] },
                    peerMock.headers,
                ]);

            const response = await sendRequest("wallets.transactions", {
                address: "AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv",
            });

            expect(response.data.result.count).toBe(2);
            expect(response.data.result.data).toHaveLength(2);
        });

        it("should fail to get transactions for the given wallet", async () => {
            const response = await sendRequest("wallets.transactions", {
                address: "AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv",
            });

            expect(response.data.error.code).toBe(404);
            expect(response.data.error.message).toBe("Wallet AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv could not be found.");
        });
    });

    describe("POST wallets.create", () => {
        it("should create a new wallet", async () => {
            const response = await sendRequest("wallets.create", {
                passphrase: "this is a top secret passphrase",
            });

            expect(response.data.result.address).toBe("AGeYmgbg2LgGxRW2vNNJvQ88PknEJsYizC");
            expect(response.data.result.publicKey).toBe(
                "034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192",
            );
        });
    });

    describe("POST wallets.bip38.*", () => {
        let bip38wif;
        const userId = require("crypto")
            .randomBytes(32)
            .toString("hex");

        describe("create", () => {
            it("should create a new wallet", async () => {
                const response = await sendRequest("wallets.bip38.create", {
                    bip38: "this is a top secret passphrase",
                    userId,
                });

                expect(response.data.result).toHaveProperty("address");
                expect(response.data.result).toHaveProperty("publicKey");
                expect(response.data.result).toHaveProperty("wif");

                bip38wif = response.data.result.wif;
            });
        });

        describe("info", () => {
            it("should find the wallet for the given userId", async () => {
                const response = await sendRequest("wallets.bip38.info", {
                    bip38: "this is a top secret passphrase",
                    userId,
                });

                expect(response.data.result).toHaveProperty("address");
                expect(response.data.result).toHaveProperty("publicKey");
                expect(response.data.result).toHaveProperty("wif");
                expect(response.data.result.wif).toBe(bip38wif);
            });

            it("should fail to find the wallet for the given userId", async () => {
                const response = await sendRequest("wallets.bip38.info", {
                    bip38: "invalid",
                    userId: "123456789",
                });

                expect(response.data.error.code).toBe(404);
                expect(response.data.error.message).toBe("User 123456789 could not be found.");
            });
        });
    });
});
