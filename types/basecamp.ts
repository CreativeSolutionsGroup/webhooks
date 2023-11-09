type BasecampTask = {
  id: string;
  status: string;
  visible_to_clients: boolean;
  created_at: Date;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: string;
  url: string;
  app_url: string;
  bookmark_url: string;
  subscription_url: string
  comments_count: number;
  comments_url: string;
  position: number;
  description: string;
  completed: boolean;
  content: string;
  starts_on: Date;
  due_on: Date;
  assignees: Array<number>;
  completion_subscribers: Array<number>;
  completion_url: string;
};

type RequestCardUpdate = {
  title?: string;
  content?: string;
  due_on?: string;
  type: string;
  projectId: string;
  cardID: string;
  assignee_ids?: Array<number>;
};

type BasecampCardUpdate = {
  title?: string;
  content?: string;
  due_on?: string;
  assignee_ids?: Array<number>;
};

type BasecampListUpdate = {
  content?: string;
  description?: string;
  due_on?: string;
  assignee_ids?: Array<number>;
};