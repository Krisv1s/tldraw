import React from "react";
import { useSync } from "@tldraw/sync";
import {
  AssetRecordType,
  getHashForString,
  TLAssetStore,
  TLBookmarkAsset,
  Tldraw,
  uniqueId,
} from "tldraw";

const WORKER_URL = `http://localhost:5858`;

function App() {
  // Извлекаем roomId из параметра URL
  const queryParams = new URLSearchParams(window.location.search);
  const roomId = queryParams.get("roomid") || "";

  if (!roomId) {
    return (
      <div>
        <h1>Не указан roomID</h1>
        <p>roomId указывается в формате ?roomid=*название комнаты*</p>
        <button
          onClick={() => {
            window.location.replace(
              window.location.pathname + "?roomid=" + crypto.randomUUID()
            );
          }}
        >
          Сгенерировать комнату
        </button>
      </div>
    );
  }

  // Создаем store, подключенный к мультиплееру
  const store = useSync({
    uri: `${WORKER_URL}/connect/${roomId}`,
    assets: multiplayerAssets,
  });

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw
        store={store}
        onMount={(editor) => {
          // @ts-expect-error
          window.editor = editor;
          editor.registerExternalAssetHandler("url", unfurlBookmarkUrl);
        }}
      />
    </div>
  );
}

const multiplayerAssets: TLAssetStore = {
  async upload(_asset, file) {
    const id = uniqueId();
    const objectName = `${id}-${file.name}`;
    const url = `${WORKER_URL}/uploads/${encodeURIComponent(objectName)}`;

    const response = await fetch(url, {
      method: "PUT",
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload asset: ${response.statusText}`);
    }

    return url;
  },
  resolve(asset) {
    return asset.props.src;
  },
};

async function unfurlBookmarkUrl({
  url,
}: {
  url: string;
}): Promise<TLBookmarkAsset> {
  const asset: TLBookmarkAsset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: "asset",
    type: "bookmark",
    meta: {},
    props: {
      src: url,
      description: "",
      image: "",
      favicon: "",
      title: "",
    },
  };

  try {
    const response = await fetch(
      `${WORKER_URL}/unfurl?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();

    asset.props.description = data?.description ?? "";
    asset.props.image = data?.image ?? "";
    asset.props.favicon = data?.favicon ?? "";
    asset.props.title = data?.title ?? "";
  } catch (e) {
    console.error(e);
  }

  return asset;
}

export default App;
