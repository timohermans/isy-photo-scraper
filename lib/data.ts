import { existsSync, PathLike } from 'fs';
import { readFile, writeFile } from 'fs/promises';


export type DataItem = {
    title: string;
    path: string;
    handled: Date;
}

export type Data = {
    files: DataItem[];
}

export async function get(path: string) {
    if (!existsSync(path)) {
        return { files: [] };
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
    const dataJson = JSON.stringify(data);
    await writeFile(path, dataJson);
}

