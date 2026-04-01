// Optional peer dependency — only needed when using GeyserEventStream
declare module "@triton-one/yellowstone-grpc" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Client: any;
  export default Client;
  export { Client };
}
