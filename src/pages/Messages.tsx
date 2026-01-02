import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ArrowLeft
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
}

const Messages = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
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
        job: m.job_id ? jobsMap.get(m.job_id) || null : null
      })) || [];

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.is_read && message.recipient_id === user?.id) {
      await markAsRead(message.id);
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, is_read: true } : m
      ));
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !user || !replyContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendingReply(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: selectedMessage.sender_id,
        job_id: selectedMessage.job_id,
        subject: `Re: ${selectedMessage.subject}`,
        content: replyContent
      });

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('notify-message', {
        body: {
          recipientId: selectedMessage.sender_id,
          senderName: profile?.full_name || user.email,
          subject: `Re: ${selectedMessage.subject}`,
          preview: replyContent.substring(0, 100)
        }
      });

      toast.success('Reply sent successfully');
      setReplyDialogOpen(false);
      setReplyContent('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const inboxMessages = messages.filter(m => m.recipient_id === user?.id);
  const sentMessages = messages.filter(m => m.sender_id === user?.id);
  const unreadCount = inboxMessages.filter(m => !m.is_read).length;

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
                        {(activeTab === 'inbox' ? inboxMessages : sentMessages).map((message) => (
                          <div
                            key={message.id}
                            onClick={() => handleSelectMessage(message)}
                            className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                              selectedMessage?.id === message.id ? 'bg-muted' : ''
                            } ${!message.is_read && activeTab === 'inbox' ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {!message.is_read && activeTab === 'inbox' ? (
                                  <Mail className="h-4 w-4 text-primary" />
                                ) : (
                                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-sm truncate ${!message.is_read && activeTab === 'inbox' ? 'font-semibold' : ''}`}>
                                    {activeTab === 'inbox' 
                                      ? (message.sender_profile?.full_name || message.sender_profile?.email || 'Unknown')
                                      : (message.recipient_profile?.full_name || message.recipient_profile?.email || 'Unknown')
                                    }
                                  </p>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {format(new Date(message.created_at), 'MMM d')}
                                  </span>
                                </div>
                                <p className={`text-sm truncate ${!message.is_read && activeTab === 'inbox' ? 'font-medium' : 'text-muted-foreground'}`}>
                                  {message.subject}
                                </p>
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {message.content.substring(0, 50)}...
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
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

            {/* Message Detail */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                {selectedMessage ? (
                  <>
                    <CardHeader className="border-b">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-1">{selectedMessage.subject}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {selectedMessage.sender_id === user?.id ? 'To: ' : 'From: '}
                              {selectedMessage.sender_id === user?.id 
                                ? (selectedMessage.recipient_profile?.full_name || selectedMessage.recipient_profile?.email)
                                : (selectedMessage.sender_profile?.full_name || selectedMessage.sender_profile?.email)
                              }
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(selectedMessage.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {selectedMessage.job && (
                            <Badge variant="secondary" className="mt-2">
                              Re: {selectedMessage.job.title} at {selectedMessage.job.company}
                            </Badge>
                          )}
                        </div>
                        {selectedMessage.recipient_id === user?.id && (
                          <Button onClick={() => setReplyDialogOpen(true)}>
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-6">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select a message</p>
                      <p className="text-sm">Choose a message from the list to view its contents</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Reply to {selectedMessage?.sender_profile?.full_name || 'Sender'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Re: {selectedMessage?.subject}</p>
              <p className="text-muted-foreground text-xs">
                Original message from {format(new Date(selectedMessage?.created_at || ''), 'MMM d, yyyy')}
              </p>
            </div>
            
            <Textarea
              placeholder="Write your reply..."
              rows={6}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendReply} 
              disabled={sendingReply}
              className="gradient-bg"
            >
              {sendingReply ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;