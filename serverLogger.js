import fs from 'node:fs/promises';
import path from 'node:path';
import {format} from 'node:util';
const LOG_PATH = './logs'

const fileExists = async (filePath) => {
    try {
        await fs.access(filePath)
        return true
    } catch (error) {
        return false
    }
}

export async function serverLogger(message, logFileName) {

    const logTimeStamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')

    const log = logTimeStamp + '\t' + message + '\n'

    try {
        if (!(await fileExists(LOG_PATH))) {
            await fs.mkdir(LOG_PATH, {recursive: true})
        }
        await fs.appendFile(path.join(LOG_PATH, logFileName), log)
    } catch (error) {
        console.log(error)
    }
}
