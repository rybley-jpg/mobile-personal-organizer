import { Filesystem, Directory } from '@capacitor/filesystem';

const DOC_DIR = 'wallet-docs';

function storedName(name: string): string {
  return `${DOC_DIR}/${Date.now()}-${name.replace(/[^\w.-]+/g, '_')}`;
}

export async function storeDocFromBase64(base64: string, name: string): Promise<string> {
  const path = storedName(name);
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Data, recursive: true });
  return path;
}

export async function storeDocFromUri(uri: string, name: string): Promise<string> {
  const path = storedName(name);
  await Filesystem.mkdir({ path: DOC_DIR, directory: Directory.Data, recursive: true }).catch(() => undefined);
  await Filesystem.copy({ from: uri, to: path, toDirectory: Directory.Data });
  return path;
}

export async function removeDocFile(path: string): Promise<void> {
  await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => undefined);
}

export async function readDocBase64(path: string): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Data });
    return typeof result.data === 'string' ? result.data : null;
  } catch {
    return null;
  }
}
