# Parlot

This tool enables system administrators to control several worker machines through [CLI](https://en.wikipedia.org/wiki/Command-line_interface) all at once. All the while using a beautiful web-based dashboard.

## Connecting as a worker

1. Download worker client software for your OS:

```
wget https://parlot.tk/install/linux
```

You can also replace *linux* for *windows* or *macos* for binary files for these systems.

2. Execute *parlot-worker* (the file you just downloaded) for the first time. It will create the `config.json` file.

```
./parlot-worker
```

3. In the `config.json`, update the *room* and *name* fields.

```
{
    "room": "ROOM_NAME",
    "name": "WORKER_NAME",
}
```

* **ROOM_NAME** must be a string matching the same room the admin will be working on. If you are not the admin, contact him.
* **WORKER_NAME** should be any string your worker will be remembered for. If you do not set this field, the worker will be given a random name.

**WARNING: Any admin inside the same room will have full control over your worker machine.**

4. Now execute *parlot-worker* again. It will begin to listen to commands from any admin inside the room.

## Connecting as an admin

1. Go to [parlot.tk](https://parlot.tk).

2. On the left menu, click the + button. Input the room name.

You will see a console for every worker inside the room. Any command given inside a console will be executed by the respective worker.

If you click on a room name in the left menu, every worker inside that room will be selected, and when you submit a command in this way, it will be executed by every worker inside the room.