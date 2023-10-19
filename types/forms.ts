type RequestData = {
  title: string;
  content: string;
  due_on: string;
  type: string;
  projectId: string;
  subId: string;
  assignee_ids?: Array<number>;
};

type BasecampCardData = {
  title: string;
  content: string;
  due_on: string;
  assignee_ids?: Array<number>;
};

type BasecampListData = {
  content: string;
  description: string;
  due_on: string;
  assignee_ids?: Array<number>;
};
