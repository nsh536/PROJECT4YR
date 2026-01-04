import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Inbox, 
  Send, 
  Loader2, 
  Mail, 
  MailOpen, 
  Reply, 
  Clock,
  User,
  CheckCheck,
  Check
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  job_id: string | null;
  subject: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  parent_message_id: string | null;
  created_at: string;
  sender_profile?: {
    full_name: string | null;
    email: string;
    company_name: string | null;
    role: string;
  } | null;
  recipient_profile?: {
    full_name: string | null;
    email: string;
    company_name: string | null;
    role: string;
  } | null;
  job?: {
    title: string;
    company: string;
  } | null;
  replies?: Message[];
}

const Messages = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMessages();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('messages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            fetchMessages();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${user.id}`
          },
          (payload) => {
            // Update read receipts in real-time
            setMessages(prev => prev.map(m => 
              m.id === payload.new.id ? { ...m, is_read: payload.new.is_read, read_at: payload.new.read_at } : m
            ));
            if (selectedMessage?.id === payload.new.id) {
              setSelectedMessage(prev => prev ? { ...prev, is_read: payload.new.is_read, read_at: payload.new.read_at } : null);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all messages where user is sender or recipient
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for senders and recipients
      const userIds = [...new Set(data?.flatMap(m => [m.sender_id, m.recipient_id]) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, company_name, role')
        .in('user_id', userIds);

      // Fetch job details
      const jobIds = [...new Set(data?.map(m => m.job_id).filter(Boolean) || [])] as string[];
      const { data: jobs } = jobIds.length > 0 ? await supabase
        .from('jobs')
        .select('id, title, company')
        .in('id', jobIds) : { data: [] };

      // Map profiles and jobs to messages
      const profilesMap = new Map<string, { full_name: string | null; email: string; company_name: string | null; role: string; }>();
      profiles?.forEach(p => profilesMap.set(p.user_id, p));
      
      const jobsMap = new Map<string, { id: string; title: string; company: string; }>();
      jobs?.forEach(j => jobsMap.set(j.id, j));

      const enrichedMessages: Message[] = data?.map(m => ({
        ...m,
        sender_profile: profilesMap.get(m.sender_id) || null,
        recipient_profile: profilesMap.get(m.recipient_id) || null,
        job: m.job_id ? jobsMap.get(m.job_id) || null : null,
        replies: []
      })) || [];

      // Group messages into threads (parent messages with their replies)
      const parentMessages = enrichedMessages.filter(m => !m.parent_message_id);
      const replyMessages = enrichedMessages.filter(m => m.parent_message_id);
      
      // Attach replies to parent messages
      parentMessages.forEach(parent => {
        parent.replies = replyMessages
          .filter(reply => reply.parent_message_id === parent.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      setMessages(parentMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: now })
        .eq('id', messageId);
      
      return now;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return null;
    }
  };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    
    // Mark the main message and all unread replies as read
    const messagesToMark = [message, ...(message.replies || [])].filter(
      m => !m.is_read && m.recipient_id === user?.id
    );
    
    for (const m of messagesToMark) {
      const readAt = await markAsRead(m.id);
      if (readAt) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === m.id) {
            return { ...msg, is_read: true, read_at: readAt };
          }
          if (msg.replies) {
            return {
              ...msg,
              replies: msg.replies.map(r => 
                r.id === m.id ? { ...r, is_read: true, read_at: readAt } : r
              )
            };
          }
          return msg;
        }));
      }
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !user || !replyContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendingReply(true);
    try {
      const { data: newReply, error } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: selectedMessage.sender_id === user.id 
          ? selectedMessage.recipient_id 
          : selectedMessage.sender_id,
        job_id: selectedMessage.job_id,
        subject: selectedMessage.subject.startsWith('Re: ') 
          ? selectedMessage.subject 
          : `Re: ${selectedMessage.subject}`,
        content: replyContent,
        parent_message_id: selectedMessage.id
      }).select().single();

      if (error) throw error;

      // Send email notification
      const recipientId = selectedMessage.sender_id === user.id 
        ? selectedMessage.recipient_id 
        : selectedMessage.sender_id;
      
      await supabase.functions.invoke('notify-message', {
        body: {
          recipientId,
          senderName: profile?.full_name || profile?.company_name || user.email,
          subject: `Re: ${selectedMessage.subject}`,
          preview: replyContent.substring(0, 100)
        }
      });

      toast.success('Reply sent successfully');
      setReplyContent('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const inboxMessages = messages.filter(m => 
    m.recipient_id === user?.id || m.replies?.some(r => r.recipient_id === user?.id)
  );
  const sentMessages = messages.filter(m => 
    m.sender_id === user?.id || m.replies?.some(r => r.sender_id === user?.id)
  );
  const unreadCount = messages.reduce((count, m) => {
    let unread = 0;
    if (m.recipient_id === user?.id && !m.is_read) unread++;
    if (m.replies) {
      unread += m.replies.filter(r => r.recipient_id === user?.id && !r.is_read).length;
    }
    return count + unread;
  }, 0);

  const getThreadUnreadCount = (message: Message) => {
    let count = 0;
    if (message.recipient_id === user?.id && !message.is_read) count++;
    if (message.replies) {
      count += message.replies.filter(r => r.recipient_id === user?.id && !r.is_read).length;
    }
    return count;
  };

  const ReadReceipt = ({ message }: { message: Message }) => {
    if (message.sender_id !== user?.id) return null;
    
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" title={
        message.read_at 
          ? `Read on ${format(new Date(message.read_at), 'MMM d, yyyy h:mm a')}`
          : message.is_read 
            ? 'Read' 
            : 'Delivered'
      }>
        {message.is_read ? (
          <CheckCheck className="h-3 w-3 text-primary" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">
                <MessageSquare className="inline-block h-8 w-8 mr-2 text-primary" />
                Messages
              </h1>
              <p className="text-muted-foreground">
                {unreadCount > 0 ? `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Your inbox is up to date'}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Message List */}
            <div className="lg:col-span-1">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-2">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full">
                      <TabsTrigger value="inbox" className="flex-1">
                        <Inbox className="h-4 w-4 mr-2" />
                        Inbox
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                            {unreadCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="sent" className="flex-1">
                        <Send className="h-4 w-4 mr-2" />
                        Sent
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="divide-y">
                        {(activeTab === 'inbox' ? inboxMessages : sentMessages).map((message) => {
                          const threadUnread = getThreadUnreadCount(message);
                          const replyCount = message.replies?.length || 0;
                          
                          return (
                            <div
                              key={message.id}
                              onClick={() => handleSelectMessage(message)}
                              className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                                selectedMessage?.id === message.id ? 'bg-muted' : ''
                              } ${threadUnread > 0 ? 'bg-primary/5' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  {threadUnread > 0 ? (
                                    <Mail className="h-4 w-4 text-primary" />
                                  ) : (
                                    <MailOpen className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-sm truncate ${threadUnread > 0 ? 'font-semibold' : ''}`}>
                                      {activeTab === 'inbox' 
                                        ? (message.sender_profile?.full_name || message.sender_profile?.email || 'Unknown')
                                        : (message.recipient_profile?.full_name || message.recipient_profile?.email || 'Unknown')
                                      }
                                    </p>
                                    <div className="flex items-center gap-1">
                                      <ReadReceipt message={message} />
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {format(new Date(message.created_at), 'MMM d')}
                                      </span>
                                    </div>
                                  </div>
                                  <p className={`text-sm truncate ${threadUnread > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                                    {message.subject}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-muted-foreground truncate flex-1">
                                      {message.content.substring(0, 40)}...
                                    </p>
                                    {replyCount > 0 && (
                                      <Badge variant="secondary" className="text-xs h-5">
                                        {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                                      </Badge>
                                    )}
                                    {threadUnread > 0 && (
                                      <Badge variant="destructive" className="text-xs h-5">
                                        {threadUnread} new
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {(activeTab === 'inbox' ? inboxMessages : sentMessages).length === 0 && (
                          <div className="text-center py-12 text-muted-foreground">
                            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No messages yet</p>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Message Detail - Threaded View */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                {selectedMessage ? (
                  <>
                    <CardHeader className="border-b flex-shrink-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-1">{selectedMessage.subject}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Started by: {selectedMessage.sender_profile?.full_name || selectedMessage.sender_profile?.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(selectedMessage.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {selectedMessage.job && (
                            <Badge variant="secondary" className="mt-2">
                              Re: {selectedMessage.job.title} at {selectedMessage.job.company}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                      {/* Thread Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {/* Original Message */}
                          <div className={`p-4 rounded-lg ${
                            selectedMessage.sender_id === user?.id 
                              ? 'bg-primary/10 ml-8' 
                              : 'bg-muted mr-8'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">
                                {selectedMessage.sender_profile?.full_name || selectedMessage.sender_profile?.email}
                              </span>
                              <div className="flex items-center gap-2">
                                <ReadReceipt message={selectedMessage} />
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(selectedMessage.created_at), 'MMM d, h:mm a')}
                                </span>
                              </div>
                            </div>
                            <p className="whitespace-pre-wrap text-sm">{selectedMessage.content}</p>
                            {selectedMessage.read_at && selectedMessage.sender_id === user?.id && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Read {format(new Date(selectedMessage.read_at), 'MMM d, h:mm a')}
                              </p>
                            )}
                          </div>

                          {/* Replies */}
                          {selectedMessage.replies?.map((reply) => (
                            <div 
                              key={reply.id}
                              className={`p-4 rounded-lg ${
                                reply.sender_id === user?.id 
                                  ? 'bg-primary/10 ml-8' 
                                  : 'bg-muted mr-8'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">
                                  {reply.sender_profile?.full_name || reply.sender_profile?.email}
                                </span>
                                <div className="flex items-center gap-2">
                                  <ReadReceipt message={reply} />
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(reply.created_at), 'MMM d, h:mm a')}
                                  </span>
                                </div>
                              </div>
                              <p className="whitespace-pre-wrap text-sm">{reply.content}</p>
                              {reply.read_at && reply.sender_id === user?.id && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Read {format(new Date(reply.read_at), 'MMM d, h:mm a')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Reply Input */}
                      <div className="border-t p-4 flex-shrink-0">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Type your reply..."
                            rows={2}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="flex-1 resize-none"
                          />
                          <Button 
                            onClick={handleSendReply} 
                            disabled={sendingReply || !replyContent.trim()}
                            size="icon"
                            className="h-auto"
                          >
                            {sendingReply ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select a conversation</p>
                      <p className="text-sm">Choose a message thread from the list to view</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;