import { existsSync, PathLike } from 'fs';
import { readFile, writeFile } from 'fs/promises';


export type DataItem = {
    title: string;
    path: string;
    handled: Date;
}

export type Data = {
    lastRan: string,
    files: DataItem[];
}

export async function get(path: string): Promise<Data> {
    if (!existsSync(path)) {
        return { lastRan: new Date().toISOString(), files: [] };
    }
    const file = await readFile(path, 'utf8');
    const data = JSON.parse(file) as Data;
    return data;
}

export async function doneWith(title: string, path: string, data: Data) {
    data.files.push(
        {
            title,
            path,
            handled: new Date()
        }
    );
}

export async function persist(data: Data, path: PathLike) {
    data.lastRan = new Date().toISOString();
    const dataJson = JSON.stringify(data);
    await writeFile(path, dataJson);
}

