# magresview-2
MagresView 2.0 - NMR crystallography visualisation app

---
### Running a local copy

MagresView 2.0 is available online at **https://ccpnc.github.io/magresview-2/** — no installation needed. Once the page is loaded, you can disconnect the internet connection and the app will continue to work offline - all the data is processed locally. However, the following instructions are for users who want to run a local copy of the app on their machine in a sandboxed environment, without relying on the GitHub Pages hosting.


#### 1. Obtain the built app

To run MagresView 2.0 offline, download the `gh-pages` branch, which contains the pre-built app. 

You can get the current version here:

https://github.com/CCP-NC/magresview-2/archive/refs/heads/gh-pages.zip

Once downloaded, you no longer need an internet connection. You simply unzip the file and run a local web server (see below), which will create a directory called `magresview-2-gh-pages`.

**Alternatively**, if you prefer, you can instead use [git](https://github.com/git-guides/install-git) to download the `gh-pages` branch:

`git clone -b gh-pages https://github.com/CCP-NC/magresview-2.git`
 
This will create a directory called `magresview-2` within which you'll find the `index.html` file.

#### 2. Run a local web server

Unfortunately, the `index.html` file often cannot be opened directly from your local machine in modern browsers. Instead, you need to run a local web server. There are many options for doing this, depending on what software you have installed on your machine. Here are some common options:

|         | Command                        |
| ------- | ------------------------------ |
| Python  | `python -m http.server 8000`   |
| Node.js | `npx http-server -p 8000`      |
| Ruby    | `ruby -run -e httpd . -p 8000` |
| PHP     | `php -S localhost:8000`        |


Having run any of these commands *from within the magresview-2 or magresview-2-gh-pages directory*, you should now be able to open a browser and navigate to `http://localhost:8000` to view the app. This will work without any internet connection.

Alternatively, if you have the Visual Studio Code editor installed, you can use the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension to run the app locally.




---
### Privacy & Data Handling

**Your data never leaves your computer.** MagresView runs entirely inside your browser — there is no server, no account, and no network connection required. Any files you load are processed locally and are never uploaded or transmitted anywhere.

MagresView automatically saves your session (loaded structures, NMR data, and settings) to your browser's local storage so you can resume work after closing or refreshing the tab.

> **⚠️ Note for shared computers:** autosaved data persists in the browser until explicitly cleared. Anyone with access to the same browser profile can open MagresView and restore your session, including any confidential or proprietary structures.

To control this behaviour, open the **Load file** sidebar and click **Privacy settings**:

- **Disable autosave** if you are working with sensitive data and do not want it stored locally.
- **Clear all autosaved data** before logging out on a shared machine. This also disables autosave so the current session is not immediately re-saved.

Alternatively, opening MagresView in your browser's **private/incognito window** prevents any session data from being saved to disk at all — the data is discarded as soon as the window is closed.

---
### Developers

Check out `docs/DevArchitecture.md` for an explanation of the structure of the software and conventions to adopt.
