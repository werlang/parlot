# Parlot

This is a tool that enables system administrators to control several worker machines through cli all at once.

## Connecting as a worker

1. Download worker client software for your OS:

```
wget https://parlot.tk/install/linux
```

You can also replace *linux* for *windows* or *macos* for executabled for these systems.

2. Execute *parlot-worker* (the file you just downloaded) for the first time. It will create the `config.json` file.

```
./parlot-worker
```

3. In the `config.json`, update the *name* and *room* fields.

```
{
    "name": "WORKER_NAME",
    "room": "ROOM_NAME",
    "wsserver": {
        "url": "https://parlot.tk",
        "port": 4210
    }
}
```

* **WORKER_NAME** should be any string your worker will be remembered for. If you do not set this field, the worker will be given a random name.
* **ROOM_NAME** must be a string matching the same room the admin will be working on. If you are not the admin, contact him.

**WARNING: Any admin inside the same room will have full control over your worker.**

4. Now execute *parlot-worker* again. It will begin to listen to commands from any admin inside the room.

## Connecting as an admin

1. Go to [https://parlot.tk](https://parlot.tk).

2. On the left menu, click the + button. Input the room name.

You will see a console for every worker inside the room. Any command given inside a console will be executed by the respective worker.

If you click on a room name in the left menu, every worker inside that room will be selected, and when you submit a command in this way, it will be executed by every worker inside the room.