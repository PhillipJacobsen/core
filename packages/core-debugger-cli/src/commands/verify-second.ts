import { crypto, models } from "@arkecosystem/crypto";
import { flags } from "@oclif/command";
import { handleOutput } from "../utils";
import { BaseCommand } from "./command";

export class VerifySecondSignatureCommand extends BaseCommand {
    public static description: string = "Verify a second signature of a transaction";

    public static flags = {
        ...BaseCommand.flags,
        data: flags.string({
            description: "the HEX blob to deserialize and verify",
            required: true,
        }),
        publicKey: flags.string({
            description: "the publicKey of the second signature in HEX",
            required: true,
        }),
    };

    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags } = this.parse(VerifySecondSignatureCommand);

        const transaction = new models.Transaction(flags.data);

        return handleOutput(flags, crypto.verifySecondSignature(transaction, flags.publicKey));
    }
}
