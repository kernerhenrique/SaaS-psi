import { requireAdminSession } from "@/server/modules/auth/session";
import { getMessageTemplates } from "@/server/modules/message/message-template.service";
import { listOutgoingMessages } from "@/server/modules/message/outgoing.service";

import { MessagesView } from "./messages-view";

export default async function MessagesPage() {
  const session = await requireAdminSession();
  const [outgoing, templates] = await Promise.all([
    listOutgoingMessages(session.businessId),
    getMessageTemplates(session.businessId),
  ]);
  return <MessagesView outgoing={outgoing} templates={templates} />;
}
