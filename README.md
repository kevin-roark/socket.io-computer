
# socket.io-computer

A collaborative virtual machine where players take turns in
controlling it.

It works by running [qemu](http://wiki.qemu.org/Main_Page) on the
server-side and streaming the image binary data to the browser.

![](https://i.cloudup.com/eLzCA3vYK5.gif)

## Dependencies

In order to run `socket.io-computer` you must have the following
dependenices installed:

- `qemu`
- `vncsnapshot`
- `redis-server`

On the mac, all of the above are available on [homebrew](http://brew.sh/).

## How to run

First you should create an image onto which you'll load (install) the
operating system ISO. We'll call it for this example `winxp.img`.

```bash
$ qemu-img create -f qcow2 winxp.img 3G
```

Then you can run the additional needed processes:

```bash
# web server
$ node app.js

# io server
$ node io.js

# emulator process
$ COMPUTER_ISO=xp.iso COMPUTER_IMG=winxp.img node emu.js
```

Then point your browser to `http://localhost:5000`.

## License

MIT
