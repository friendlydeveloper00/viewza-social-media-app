import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Shield, Users, FileText, BarChart3, Settings, Code,
  Loader2, Trash2, Search, RefreshCw, Bell, Database,
  ToggleLeft, Terminal, ArrowLeft, Plus,
} from "lucide-react";

interface ProfileRow {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface PostRow {
  id: string;
  caption: string | null;
  user_id: string;
  created_at: string;
}

interface TableInfo {
  name: string;
  count: number;
}

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}

export default function Admin() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <Shield className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have admin privileges.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage Viewza — Developer Controls</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full overflow-x-auto flex">
          <TabsTrigger value="users" className="flex-shrink-0 gap-1.5"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
          <TabsTrigger value="content" className="flex-shrink-0 gap-1.5"><FileText className="h-3.5 w-3.5" />Content</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-shrink-0 gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Analytics</TabsTrigger>
          <TabsTrigger value="flags" className="flex-shrink-0 gap-1.5"><ToggleLeft className="h-3.5 w-3.5" />Flags</TabsTrigger>
          <TabsTrigger value="database" className="flex-shrink-0 gap-1.5"><Database className="h-3.5 w-3.5" />DB</TabsTrigger>
          <TabsTrigger value="settings" className="flex-shrink-0 gap-1.5"><Settings className="h-3.5 w-3.5" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="content"><ContentTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        <TabsContent value="flags"><FeatureFlagsTab /></TabsContent>
        <TabsContent value="database"><DatabaseTab /></TabsContent>
        <TabsContent value="settings"><AppSettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────
function UsersTab() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setProfiles((data as ProfileRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = profiles.filter(p =>
    (p.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (userId: string) => {
    if (!confirm("Delete this user's profile? This cannot be undone.")) return;
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile deleted" });
      fetchUsers();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> User Management</CardTitle>
        <CardDescription>{profiles.length} users total</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-secondary/50"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filtered.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                      {(p.username || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.display_name || p.username || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">@{p.username || "—"} · {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.user_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Content Tab ─────────────────────────────────────────────
function ContentTab() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("id, caption, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setPosts((data as PostRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post deleted" });
      fetchPosts();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Content Moderation</CardTitle>
        <CardDescription>{posts.length} posts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={fetchPosts}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {posts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{p.caption || <span className="italic text-muted-foreground">No caption</span>}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0" onClick={() => handleDeletePost(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {posts.length === 0 && <p className="text-center text-muted-foreground py-8">No posts</p>}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Analytics Tab ───────────────────────────────────────────
function AnalyticsTab() {
  const [stats, setStats] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const tables = ["profiles", "posts", "comments", "likes", "stories", "follows", "conversations", "messages", "notifications"] as const;

  const fetchStats = async () => {
    setLoading(true);
    const results: TableInfo[] = [];
    for (const table of tables) {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      results.push({ name: table, count: count || 0 });
    }
    setStats(results);
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Analytics Overview</CardTitle>
        <CardDescription>Live data counts from your database</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stats.map(s => (
              <div key={s.name} className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                <p className="text-2xl font-bold text-primary">{s.count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground capitalize mt-1">{s.name}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Feature Flags Tab (DB-backed) ───────────────────────────
function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fetchFlags = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feature_flags" as any)
      .select("*")
      .order("created_at", { ascending: true });
    setFlags((data as unknown as FeatureFlag[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchFlags(); }, []);

  const toggleFlag = async (id: string, currentEnabled: boolean) => {
    const { error } = await (supabase.from("feature_flags" as any) as any)
      .update({ enabled: !currentEnabled, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !currentEnabled } : f));
      toast({ title: "Flag updated" });
    }
  };

  const addFlag = async () => {
    if (!newKey.trim()) return;
    const { error } = await (supabase.from("feature_flags" as any) as any)
      .insert({ key: newKey.trim().toLowerCase().replace(/\s+/g, "_"), description: newDesc.trim() || null, enabled: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewKey("");
      setNewDesc("");
      fetchFlags();
      toast({ title: "Flag created" });
    }
  };

  const deleteFlag = async (id: string) => {
    if (!confirm("Delete this feature flag?")) return;
    const { error } = await (supabase.from("feature_flags" as any) as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchFlags();
      toast({ title: "Flag deleted" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ToggleLeft className="h-5 w-5" /> Feature Flags</CardTitle>
        <CardDescription>Toggle features without redeploying. Persisted in the database.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new flag */}
        <div className="flex gap-2">
          <Input
            placeholder="Flag key (e.g. dark_mode)"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            className="bg-secondary/50 flex-1"
          />
          <Input
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="bg-secondary/50 flex-1"
          />
          <Button size="sm" onClick={addFlag} disabled={!newKey.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : flags.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No feature flags yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {flags.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{f.key}</p>
                  {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch checked={f.enabled} onCheckedChange={() => toggleFlag(f.id, f.enabled)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFlag(f.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Database Tab ────────────────────────────────────────────
function DatabaseTab() {
  const [selectedTable, setSelectedTable] = useState("profiles");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const tables = ["profiles", "posts", "comments", "likes", "stories", "follows", "conversations", "messages", "notifications", "post_media", "hashtags", "post_hashtags", "push_subscriptions", "feature_flags", "user_roles"] as const;

  const fetchRows = async (table: string) => {
    setLoading(true);
    setSelectedTable(table);
    const { data } = await (supabase.from(table as any) as any).select("*").order("created_at", { ascending: false }).limit(50);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRows("profiles"); }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Database Viewer</CardTitle>
        <CardDescription>Browse tables (read-only, 50 rows max)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1.5 flex-wrap">
          {tables.map(t => (
            <Button
              key={t}
              variant={selectedTable === t ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => fetchRows(t)}
            >
              {t}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No data in {selectedTable}</p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {rows.map((row, i) => (
                <details key={i} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <summary className="cursor-pointer text-sm font-mono truncate">
                    {row.id ? `${row.id.slice(0, 8)}...` : `Row ${i + 1}`}
                    {row.username && <span className="ml-2 text-muted-foreground">@{row.username}</span>}
                    {row.caption && <span className="ml-2 text-muted-foreground truncate">{row.caption?.slice(0, 40)}</span>}
                    {row.key && <span className="ml-2 text-muted-foreground">{row.key}</span>}
                  </summary>
                  <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(row, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── App Settings Tab ────────────────────────────────────────
function AppSettingsTab() {
  const [testTitle, setTestTitle] = useState("Test Notification");
  const [testBody, setTestBody] = useState("This is a test push notification from admin");

  const sendTestPush = async () => {
    toast({ title: "Push test", description: "Test notification would be sent (requires push setup)" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> App Settings & Dev Tools</CardTitle>
        <CardDescription>Configure app behavior and test features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notification Tester */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Push Notification Tester</h3>
          <div className="space-y-2">
            <Input
              placeholder="Notification title"
              value={testTitle}
              onChange={e => setTestTitle(e.target.value)}
              className="bg-secondary/50"
            />
            <Input
              placeholder="Notification body"
              value={testBody}
              onChange={e => setTestBody(e.target.value)}
              className="bg-secondary/50"
            />
            <Button size="sm" onClick={sendTestPush}>
              <Bell className="h-3.5 w-3.5 mr-1.5" /> Send Test
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Terminal className="h-4 w-4" /> Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              localStorage.clear();
              toast({ title: "Local storage cleared" });
            }}>
              Clear Local Storage
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if ('caches' in window) {
                caches.keys().then(names => names.forEach(name => caches.delete(name)));
                toast({ title: "Cache cleared" });
              }
            }}>
              Clear Cache
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
                toast({ title: "Service workers unregistered" });
              }
            }}>
              Reset Service Workers
            </Button>
          </div>
        </div>

        {/* System Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Code className="h-4 w-4" /> System Info</h3>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 font-mono text-xs space-y-1">
            <p>Platform: {navigator.platform}</p>
            <p>User Agent: {navigator.userAgent.slice(0, 80)}…</p>
            <p>Screen: {window.screen.width}×{window.screen.height}</p>
            <p>Viewport: {window.innerWidth}×{window.innerHeight}</p>
            <p>Online: {navigator.onLine ? "Yes" : "No"}</p>
            <p>SW Support: {"serviceWorker" in navigator ? "Yes" : "No"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
