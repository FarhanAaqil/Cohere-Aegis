import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminRole } from "@/lib/roles";
import { chatApi, ChatGroup, ChatMessage, ChatMember } from "@/lib/chat-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Plus, Users, ArrowLeft, UserPlus, UserMinus, Phone, Video, User, Search, X } from "lucide-react";
import { format } from "date-fns";
import { adminApi } from "@/lib/admin-api";
import { useWebRTC } from "@/hooks/useWebRTC";
import { CallScreen } from "@/components/chat/CallScreen";
import { IncomingCallDialog } from "@/components/chat/IncomingCallDialog";

export default function ChatsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create group state
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupType, setNewGroupType] = useState("GENERAL");

  // Add member state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; first_name: string; last_name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Direct message state
  const [dmOpen, setDmOpen] = useState(false);
  const [dmTargetId, setDmTargetId] = useState("");
  const [dmLoading, setDmLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<(ChatMessage & { group: { id: string; name: string; group_type: string } | null })[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const { groups } = await chatApi.getGroups();
      setGroups(groups);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to load groups", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadMessages = useCallback(async (groupId: string) => {
    try {
      const { messages } = await chatApi.getMessages(groupId);
      setMessages(messages);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to load messages", variant: "destructive" });
    }
  }, [toast]);

  const loadMembers = useCallback(async (groupId: string) => {
    try {
      const { members } = await chatApi.getMembers(groupId);
      setMembers(members);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // Load messages when group selected
  useEffect(() => {
    if (!selectedGroup) return;
    loadMessages(selectedGroup.id);
    loadMembers(selectedGroup.id);
  }, [selectedGroup, loadMessages, loadMembers]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!selectedGroup) return;

    const channel = supabase
      .channel(`chat-${selectedGroup.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `group_id=eq.${selectedGroup.id}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Fetch sender info
          const existingSender = messages.find((m) => m.sender_id === newMsg.sender_id)?.sender;
          if (existingSender) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, { ...newMsg, sender: existingSender }];
            });
          } else {
            // Reload to get sender info
            await loadMessages(selectedGroup.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup, messages, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedGroup || sending) return;
    setSending(true);
    try {
      await chatApi.sendMessage(selectedGroup.id, messageText.trim());
      setMessageText("");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await chatApi.createGroup({ name: newGroupName.trim(), description: newGroupDesc.trim() || undefined, group_type: newGroupType });
      setCreateOpen(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setNewGroupType("GENERAL");
      loadGroups();
      toast({ title: "Group created" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create group", variant: "destructive" });
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !selectedUserId) return;
    try {
      await chatApi.addMembers(selectedGroup.id, [selectedUserId]);
      setAddMemberOpen(false);
      setSelectedUserId("");
      loadMembers(selectedGroup.id);
      toast({ title: "Member added" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;
    try {
      await chatApi.removeMember(selectedGroup.id, userId);
      loadMembers(selectedGroup.id);
      toast({ title: "Member removed" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const loadAllUsers = async () => {
    try {
      const { users } = await adminApi.getUsers();
      setAllUsers(users);
    } catch { /* ignore */ }
  };

  const handleStartDM = async () => {
    if (!dmTargetId) return;
    setDmLoading(true);
    try {
      const { group } = await chatApi.startDirect(dmTargetId);
      setDmOpen(false);
      setDmTargetId("");
      await loadGroups();
      setSelectedGroup(group);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to start chat", variant: "destructive" });
    } finally {
      setDmLoading(false);
    }
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { messages } = await chatApi.searchMessages(q.trim());
      setSearchResults(messages);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleSearchResultClick = (result: typeof searchResults[0]) => {
    const group = groups.find((g) => g.id === result.group_id);
    if (group) {
      setSelectedGroup(group);
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const isAdmin = isAdminRole(user?.role);

  // WebRTC calling
  const webrtc = useWebRTC({
    userId: user?.id || "",
    userName: user ? `${user.first_name} ${user.last_name}` : "",
  });

  // Listen for incoming calls on all groups
  useEffect(() => {
    if (!groups.length || !user?.id) return;
    const unsub = webrtc.listenForCalls(groups.map((g) => g.id));
    return unsub;
  }, [groups, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading chats...</div>;
  }

  // Chat window view
  if (selectedGroup) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Call overlays */}
        {webrtc.callState !== "idle" && (
          <CallScreen
            callState={webrtc.callState}
            callType={webrtc.callType}
            remoteUserName={webrtc.remoteUserName}
            callDuration={webrtc.callDuration}
            isMuted={webrtc.isMuted}
            isVideoOff={webrtc.isVideoOff}
            isScreenSharing={webrtc.isScreenSharing}
            localVideoRef={webrtc.localVideoRef as any}
            remoteVideoRef={webrtc.remoteVideoRef as any}
            onEndCall={webrtc.endCall}
            onToggleMute={webrtc.toggleMute}
            onToggleVideo={webrtc.toggleVideo}
            onToggleScreenShare={webrtc.toggleScreenShare}
          />
        )}

        <IncomingCallDialog
          open={!!webrtc.incomingCall}
          callerName={webrtc.incomingCall?.callerName || ""}
          callType={webrtc.incomingCall?.callType || "audio"}
          onAnswer={() => webrtc.incomingCall && webrtc.answerCall(webrtc.incomingCall)}
          onReject={() => webrtc.incomingCall && webrtc.rejectCall(webrtc.incomingCall)}
        />

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50 header-glass">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedGroup(null); setMessages([]); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">{selectedGroup.name}</h2>
            {selectedGroup.description && (
              <p className="text-xs text-muted-foreground">{selectedGroup.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-primary"
              onClick={() => webrtc.startCall(selectedGroup.id, "audio", selectedGroup.name)}
              disabled={webrtc.callState !== "idle"}
              title="Voice call"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-primary"
              onClick={() => webrtc.startCall(selectedGroup.id, "video", selectedGroup.name)}
              disabled={webrtc.callState !== "idle"}
              title="Video call"
            >
              <Video className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowMembers(!showMembers)}>
            <Users className="h-4 w-4 mr-1" />
            {members.length}
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">No messages yet. Start the conversation!</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.id;
                    const msgDate = new Date(msg.created_at);
                    const prevDate = idx > 0 ? new Date(messages[idx - 1].created_at) : null;
                    const showDateSep = !prevDate || prevDate.toDateString() !== msgDate.toDateString();
                    const today = new Date();
                    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
                    const dateLabel =
                      msgDate.toDateString() === today.toDateString() ? "Today"
                      : msgDate.toDateString() === yesterday.toDateString() ? "Yesterday"
                      : format(msgDate, "EEEE, MMMM d, yyyy");
                    return (
                      <div key={msg.id}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-border/50" />
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted/50">
                              {dateLabel}
                            </span>
                            <div className="flex-1 h-px bg-border/50" />
                          </div>
                        )}
                        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-4 py-2.5 ${isMe ? "chat-bubble-self" : "chat-bubble-other"}`}>
                            {!isMe && (
                              <div className="text-xs font-medium mb-1 opacity-70">
                                {msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : "Unknown"}
                              </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                            <div className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {format(msgDate, "h:mm a")}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border/50 header-glass">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={!messageText.trim() || sending} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          {/* Members sidebar */}
          {showMembers && (
            <div className="w-64 border-l border-border bg-card p-4 overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Members</h3>
                {isAdmin && (
                  <Dialog open={addMemberOpen} onOpenChange={(o) => { setAddMemberOpen(o); if (o) loadAllUsers(); }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                        <SelectContent>
                          {allUsers
                            .filter((u) => !members.some((m) => m.user_id === u.id))
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.first_name} {u.last_name} ({u.email})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAddMember} disabled={!selectedUserId}>Add</Button>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-foreground">
                        {m.user ? `${m.user.first_name} ${m.user.last_name}` : "Unknown"}
                      </div>
                      <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                    </div>
                    {isAdmin && m.user_id !== user?.id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveMember(m.user_id)}>
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Group list view
  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-heading">Chats</h1>
          <p className="page-subheading">Group & direct conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); setSearchResults([]); }}>
            {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
          {/* New Direct Chat - available to all users */}
          <Dialog open={dmOpen} onOpenChange={(o) => { setDmOpen(o); if (o) loadAllUsers(); }}>
            <DialogTrigger asChild>
              <Button variant="outline"><User className="h-4 w-4 mr-1" /> New Chat</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Start a Direct Chat</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select a person</Label>
                  <Select value={dmTargetId} onValueChange={setDmTargetId}>
                    <SelectTrigger><SelectValue placeholder="Choose someone..." /></SelectTrigger>
                    <SelectContent>
                      {allUsers
                        .filter((u) => u.id !== user?.id)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleStartDM} disabled={!dmTargetId || dmLoading} className="w-full">
                  {dmLoading ? "Starting..." : "Start Chat"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* New Group - admin only */}
          {isAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> New Group</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Chat Group</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" />
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="What's this group for?" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={newGroupType} onValueChange={setNewGroupType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GENERAL">General</SelectItem>
                        <SelectItem value="TEAM">Team</SelectItem>
                        <SelectItem value="PROJECT">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="w-full">Create Group</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="mb-4">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className="mb-2"
          />
          {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
          {searchResults.length > 0 && (
            <Card className="divide-y divide-border max-h-80 overflow-auto">
              {searchResults.map((r) => (
                <div
                  key={r.id}
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSearchResultClick(r)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-primary">
                      {r.group?.name || "Unknown group"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">{r.message_text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {r.sender ? `${r.sender.first_name} ${r.sender.last_name}` : "Unknown"}
                  </p>
                </div>
              ))}
            </Card>
          )}
          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No messages found</p>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <Card className="card-premium p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-1">No chats yet</h3>
          <p className="text-sm text-muted-foreground">
            Start a direct chat or {isAdmin ? "create a group" : "ask an admin to add you to a group"}.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="card-premium p-4 cursor-pointer hover:bg-muted/20"
              onClick={() => setSelectedGroup(group)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${group.group_type === "DIRECT" ? "bg-accent/10" : "bg-primary/8"}`}>
                    {group.group_type === "DIRECT" ? (
                      <User className="h-5 w-5 text-accent-foreground" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{group.name}</h3>
                    {group.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {group.group_type === "DIRECT" ? "Direct" : group.group_type}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
