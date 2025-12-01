declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module '*?worker&inline' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}

declare module '*.ts?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}
