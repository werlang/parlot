# Parlot

This tool enables system administrators to control several worker machines through [CLI](https://en.wikipedia.org/wiki/Command-line_interface) all at once. All the while using a beautiful web-based dashboard.

## Connecting as a worker

1. Download worker client software for your OS:

```
wget https://parlot.tk/download/linux
```

You can also replace *linux* for *windows* or *macos* for binary files for these systems.

2. Execute *parlot-worker* (the file you just downloaded). It will guide you through the process of setting up the **room** and **worker** names.

```
./parlot-worker
```

**WARNING: Any admin inside the same room will have full control over your worker machine.**

3. The worker client will begin to listen to commands from any admin inside the room.

## Connecting as an admin

1. Go to [parlot.tk](https://parlot.tk).

2. On the left menu, click the + button. Input the room name.

You will see a console for every worker inside the room. Any command given inside a console will be executed by the respective worker.

If you click on a room name in the left menu, every worker inside that room will be selected, and when you submit a command in this way, it will be executed by every worker inside the room.