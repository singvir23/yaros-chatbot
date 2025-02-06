# Sentimental Chatbot

The Sentimental Chatbot was created for my Professor's JOUR289i class with around 70 students. He told me that numerous students would ask him questions that could be directly answered by the syllabus. To solve this problem, he wanted me to create a chatbot which can answer these syllabus-related questions for him.

ChatGPT has an Assistants API which allows the use of files as context for the model. Using the syllabus as the 'context,' the model is easily able to answer any questions related to the syllabus. One issue I ran into was having the model make up information that wasn't on the syllabus. To address this, I used some negative prompting to ensure that any non-answerable question is directed to the Professor's email.

To raise mental health awareness and provide useful resources, I incorporated sentiment analysis into the model. When the system detects that a student's mood is negative or sad it automatically provides UMD-specific resources to help them get the help they need. This ensures that students who might not know where to turn can easily access the support services available to them.
