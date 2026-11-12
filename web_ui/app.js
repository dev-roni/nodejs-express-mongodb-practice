// Backend deploy হলে এখানে Render-এর URL বসাবে (শেষে / দেবে না)
const API_URL = "http://localhost:5000";

let token = localStorage.getItem("token");
let me = null;
let page = 1;
let totalPages = 1;

const $ = (id) => document.getElementById(id);
const run = (fn) => fn().catch((e) => show(e.message, true));

function show(text, isError) {
  $("msg").textContent = text;
  $("msg").style.color = isError ? "red" : "green";
}

async function api(path, method = "GET", body) {
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function btn(label, onClick) {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = () => run(onClick);
  return b;
}

// ---------- Auth ----------
async function authenticate(path, body) {
  const data = await api(path, "POST", body);
  token = data.token;
  localStorage.setItem("token", token);
  show("");
  await start();
}

$("loginBtn").onclick = () =>
  run(() => authenticate("/api/auth/login", { email: $("email").value, password: $("password").value }));

$("registerBtn").onclick = () =>
  run(() =>
    authenticate("/api/auth/register", {
      name: $("name").value,
      email: $("email").value,
      password: $("password").value,
      interests: $("interests").value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
    })
  );

$("logoutBtn").onclick = () => {
  localStorage.removeItem("token");
  location.reload();
};

async function start() {
  try {
    me = (await api("/api/auth/me")).user;
  } catch {
    token = null;
    localStorage.removeItem("token");
    return;
  }
  $("auth").hidden = true;
  $("app").hidden = false;
  $("who").textContent = me.name + " (" + me.role + ")";
  $("admin").hidden = me.role !== "admin";

  run(loadNotes);
  if (me.role === "admin") {
    run(loadUsers);
    run(loadAllNotes);
    run(loadGroups);
  }
}

// ---------- My notes ----------
async function loadNotes() {
  const data = await api(`/api/notes?page=${page}&limit=5`);
  totalPages = data.totalPages || 1;
  $("pageInfo").textContent = `Page ${data.page} / ${totalPages}`;

  const ul = $("notes");
  ul.innerHTML = "";
  data.data.forEach((n) => {
    const li = document.createElement("li");
    li.append(n.title + " - " + n.content + " ");
    li.append(
      btn("Edit", async () => {
        const title = prompt("Title", n.title);
        if (title === null) return;
        const content = prompt("Content", n.content);
        if (content === null) return;
        await api("/api/notes/" + n._id, "PUT", { title, content });
        await loadNotes();
      })
    );
    li.append(
      btn("Delete", async () => {
        await api("/api/notes/" + n._id, "DELETE");
        await loadNotes();
      })
    );
    ul.append(li);
  });
}

$("addNote").onclick = () =>
  run(async () => {
    await api("/api/notes", "POST", { title: $("noteTitle").value, content: $("noteContent").value });
    $("noteTitle").value = "";
    $("noteContent").value = "";
    page = 1;
    await loadNotes();
  });

$("prev").onclick = () => { if (page > 1) { page--; run(loadNotes); } };
$("next").onclick = () => { if (page < totalPages) { page++; run(loadNotes); } };

// ---------- Posts ----------
$("addPost").onclick = () =>
  run(async () => {
    await api("/api/posts", "POST", { title: $("postTitle").value, body: $("postBody").value });
    $("postTitle").value = "";
    $("postBody").value = "";
    await viewPosts(me._id);
  });

async function viewPosts(userId) {
  const data = await api(`/api/posts/user/${userId}?page=1&limit=10`);
  $("postsOut").textContent = JSON.stringify(data, null, 2);
}

// ---------- Admin ----------
async function loadUsers() {
  const data = await api("/api/users?page=1&limit=20");
  const ul = $("users");
  ul.innerHTML = "";
  data.data.forEach((u) => {
    const li = document.createElement("li");
    li.append(`${u.name} | ${u.email} | ${u.role} | [${u.interests.join(", ")}] `);
    li.append(btn("Posts", () => viewPosts(u._id)));
    li.append(
      btn("Delete", async () => {
        if (!confirm("Delete this user and all their notes/posts?")) return;
        await api("/api/users/" + u._id, "DELETE");
        await loadUsers();
        await loadAllNotes();
        await loadGroups();
      })
    );
    ul.append(li);
  });
}

$("addUser").onclick = () =>
  run(async () => {
    await api("/api/users", "POST", {
      name: $("auName").value,
      email: $("auEmail").value,
      password: $("auPassword").value,
      role: $("auRole").value,
    });
    await loadUsers();
  });

async function loadAllNotes() {
  const data = await api("/api/notes/all?page=1&limit=20");
  const ul = $("allNotes");
  ul.innerHTML = "";
  data.data.forEach((n) => {
    const li = document.createElement("li");
    li.textContent = `${n.owner ? n.owner.name : "?"}: ${n.title} - ${n.content}`;
    ul.append(li);
  });
}

async function loadGroups() {
  const data = await api("/api/users/grouped/interests");
  $("groups").textContent = JSON.stringify(data.data, null, 2);
}

// পেজ খুললে আগের token থাকলে সরাসরি ঢুকে যাবে
if (token) run(start);