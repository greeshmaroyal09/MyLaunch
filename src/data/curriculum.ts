import type { Curriculum, CurriculumLane, CurriculumTrack, CurriculumTask, Subject, Topic } from '../domain/curriculum'
import type { PracticeResource, TaskType } from '../domain/task'

type TopicSeed = {
  taskId?: string
  title: string
  type: TaskType
  minutes: number
  description: string
  practiceResources?: PracticeResource[]
}

type PairedTopicSeed = {
  key: string
  learnTitle: string
  practiceTitle: string
  description: string
  learnMinutes: number
  practiceMinutes: number
  learnResources?: PracticeResource[]
  practiceResources?: PracticeResource[]
  legacyTaskId?: string
}

type SubjectSeed = {
  id: string
  name: string
  track: CurriculumTrack
  lane?: CurriculumLane
  roadmapOrder?: number
  module: string
  topics?: TopicSeed[]
  pairedTopics?: PairedTopicSeed[]
  prerequisiteTaskId?: string
}

function makeResource(
  title: string,
  url: string,
  platform: PracticeResource['platform'],
  resourceType: PracticeResource['resourceType'],
  usage: PracticeResource['usage'],
  options: Partial<Omit<PracticeResource, 'title' | 'url' | 'platform' | 'resourceType' | 'usage'>> = {},
): PracticeResource {
  return {
    id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${usage.toLowerCase()}`,
    title,
    platform,
    type: platform,
    resourceType,
    usage,
    url,
    ...options,
  }
}

function buildSingleTopicSubject(seed: SubjectSeed, subjectOrder: number): Subject {
  let previousTaskId: string | undefined = seed.prerequisiteTaskId
  const topics: Topic[] = (seed.topics ?? []).map((topicSeed, topicIndex) => {
    const taskId = topicSeed.taskId ?? `${seed.id}-task-${String(topicIndex + 1).padStart(2, '0')}`
    const topicId = `${seed.id}-topic-${String(topicIndex + 1).padStart(2, '0')}`
    const prerequisiteTaskIds = previousTaskId ? [previousTaskId] : []
    const task: CurriculumTask = {
      id: taskId,
      topicId,
      title: topicSeed.title,
      subject: seed.name,
      type: topicSeed.type,
      description: topicSeed.description,
      estimatedMinutes: topicSeed.minutes,
      priority: seed.track === 'Primary' ? 100 : 30,
      required: true,
      dueOffsetDays: 0,
      prerequisiteTaskIds,
      practiceResources: topicSeed.practiceResources,
      prerequisiteRelationships: prerequisiteTaskIds.map((prerequisiteId) => ({
        taskId: prerequisiteId,
        relationship: 'required-before',
      })),
    }
    previousTaskId = taskId
    return {
      id: topicId,
      title: topicSeed.title,
      description: topicSeed.description,
      order: topicIndex + 1,
      tasks: [task],
    }
  })

  return {
    id: seed.id,
    name: seed.name,
    track: seed.track,
    lane: seed.lane ?? (seed.track === 'Primary' ? 'Shared foundation' : 'Secondary Java'),
    roadmapOrder: seed.roadmapOrder ?? subjectOrder,
    order: subjectOrder,
    modules: [{
      id: `${seed.id}-module-01`,
      title: seed.module,
      order: 1,
      topics,
    }],
  }
}

function buildPairedTopicSubject(seed: SubjectSeed, subjectOrder: number): Subject {
  let previousTaskId: string | undefined = seed.prerequisiteTaskId
  const topics: Topic[] = (seed.pairedTopics ?? []).map((pair, topicIndex) => {
    const topicId = `${seed.id}-topic-${String(topicIndex + 1).padStart(2, '0')}`
    const learnId = `${seed.id}-${pair.key}-learn`
    const practiceId = `${seed.id}-${pair.key}-practice`
    const learnPrerequisiteTaskIds = previousTaskId ? [previousTaskId] : []
    const learnTask: CurriculumTask = {
      id: learnId,
      topicId,
      title: pair.learnTitle,
      subject: seed.name,
      topic: pair.learnTitle,
      type: 'Learn',
      description: pair.description,
      estimatedMinutes: pair.learnMinutes,
      priority: seed.track === 'Primary' ? 100 : 30,
      required: true,
      dueOffsetDays: 0,
      prerequisiteTaskIds: learnPrerequisiteTaskIds,
      pairedTaskId: practiceId,
      legacyTaskIds: pair.legacyTaskId ? [pair.legacyTaskId] : undefined,
      practiceResources: pair.learnResources,
      prerequisiteRelationships: learnPrerequisiteTaskIds.map((prerequisiteId) => ({
        taskId: prerequisiteId,
        relationship: 'required-before',
      })),
    }
    const practiceTask: CurriculumTask = {
      id: practiceId,
      topicId,
      title: pair.practiceTitle,
      subject: seed.name,
      topic: pair.learnTitle,
      type: 'Practice',
      description: `${pair.practiceTitle} for the same concept using guided practice.`,
      estimatedMinutes: pair.practiceMinutes,
      priority: seed.track === 'Primary' ? 100 : 30,
      required: true,
      dueOffsetDays: 0,
      prerequisiteTaskIds: [learnId],
      pairedTaskId: learnId,
      legacyTaskIds: pair.legacyTaskId ? [pair.legacyTaskId] : undefined,
      practiceResources: pair.practiceResources ?? pair.learnResources,
      prerequisiteRelationships: [{ taskId: learnId, relationship: 'required-before' }],
    }
    previousTaskId = practiceId
    return {
      id: topicId,
      title: pair.learnTitle,
      description: pair.description,
      order: topicIndex + 1,
      tasks: [learnTask, practiceTask],
    }
  })

  return {
    id: seed.id,
    name: seed.name,
    track: seed.track,
    lane: seed.lane ?? (seed.track === 'Primary' ? 'Shared foundation' : 'Secondary Java'),
    roadmapOrder: seed.roadmapOrder ?? subjectOrder,
    order: subjectOrder,
    modules: [{
      id: `${seed.id}-module-01`,
      title: seed.module,
      order: 1,
      topics,
    }],
  }
}

function buildSubject(seed: SubjectSeed, subjectOrder: number): Subject {
  return seed.pairedTopics ? buildPairedTopicSubject(seed, subjectOrder) : buildSingleTopicSubject(seed, subjectOrder)
}

const subjectSeeds: SubjectSeed[] = [
  {
    id: 'java',
    name: 'Java',
    track: 'Secondary',
    module: 'Java 1.01 / 1.02 — Foundations & OOP',
    pairedTopics: [
      { key: 'basics', learnTitle: 'Java Basics', practiceTitle: 'Java Basics Practice', description: 'Set up a Java program and understand its structure.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Java Tutorial', 'https://docs.oracle.com/javase/tutorial/getStarted/index.html', 'Official Documentation', 'Tutorial', 'LEARN', { subject: 'Java', topic: 'Java Basics' })], practiceResources: [makeResource('Java Hello World', 'https://www.hackerrank.com/challenges/hello-world/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Java Basics' })], legacyTaskId: 'java-task-01' },
      { key: 'variables', learnTitle: 'Variables & Data Types', practiceTitle: 'Variables & Data Types Practice', description: 'Work with primitive types, variables, and conversions.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Variables and Data Types', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/datatypes.html', 'Java Documentation', 'Documentation', 'LEARN', { subject: 'Java', topic: 'Variables & Data Types' })], practiceResources: [makeResource('Java Stdin and Stdout I', 'https://www.hackerrank.com/challenges/java-stdin-stdout/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Variables & Data Types' })], legacyTaskId: 'java-task-02' },
      { key: 'ifelse', learnTitle: 'if / else fundamentals', practiceTitle: 'if / else coding practice', description: 'Use conditionals to branch your code based on true and false conditions.', learnMinutes: 15, practiceMinutes: 15, learnResources: [makeResource('if Statements', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/if.html', 'Java Documentation', 'Documentation', 'LEARN', { subject: 'Java', topic: 'if / else' })], practiceResources: [makeResource('Java If-Else', 'https://www.hackerrank.com/challenges/java-if-else/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'if / else' })], legacyTaskId: 'java-task-03' },
      { key: 'switch', learnTitle: 'switch statements', practiceTitle: 'switch statement practice', description: 'Choose a branch from fixed options with switch expressions and cases.', learnMinutes: 15, practiceMinutes: 15, learnResources: [makeResource('switch Statements', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/switch.html', 'Java Documentation', 'Documentation', 'LEARN', { subject: 'Java', topic: 'switch' })], practiceResources: [makeResource('Java Switch', 'https://www.hackerrank.com/challenges/java-switch/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'switch' })] },
      { key: 'loops', learnTitle: 'loops', practiceTitle: 'loops practice', description: 'Repeat blocks of code using while, for, and do-while patterns.', learnMinutes: 20, practiceMinutes: 20, learnResources: [makeResource('Loops', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/for.html', 'Java Documentation', 'Documentation', 'LEARN', { subject: 'Java', topic: 'loops' })], practiceResources: [makeResource('Java Loops', 'https://www.hackerrank.com/challenges/java-loops/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'loops' })] },
      { key: 'methods', learnTitle: 'Methods', practiceTitle: 'Methods Practice', description: 'Create reusable logic with parameters, returns, and scope.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Methods', 'https://docs.oracle.com/javase/tutorial/java/javaOO/methods.html', 'Java Documentation', 'Documentation', 'LEARN', { subject: 'Java', topic: 'Methods' })], practiceResources: [makeResource('Java Methods', 'https://www.hackerrank.com/challenges/java-methods/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Methods' })], legacyTaskId: 'java-task-04' },
      { key: 'arrays', learnTitle: 'Arrays', practiceTitle: 'Arrays Practice', description: 'Create, traverse, and update Java arrays.', learnMinutes: 25, practiceMinutes: 25, learnResources: [makeResource('Arrays', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/arrays.html', 'Java Documentation', 'Documentation', 'LEARN', { subject: 'Java', topic: 'Arrays' })], practiceResources: [makeResource('Java Array', 'https://www.hackerrank.com/challenges/java-array/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Arrays' })], legacyTaskId: 'java-task-05' },
      { key: 'strings', learnTitle: 'Strings', practiceTitle: 'Strings Practice', description: 'Use String operations and build text safely.', learnMinutes: 20, practiceMinutes: 20, learnResources: [makeResource('Strings', 'https://docs.oracle.com/javase/tutorial/java/data/strings.html', 'Java Documentation', 'Documentation', 'LEARN', { subject: 'Java', topic: 'Strings' })], practiceResources: [makeResource('Java Strings Introduction', 'https://www.hackerrank.com/challenges/java-strings-introduction/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Strings' })], legacyTaskId: 'java-task-06' },
      { key: 'oop', learnTitle: 'OOP Basics', practiceTitle: 'OOP Practice', description: 'Model state and behavior with classes and objects.', learnMinutes: 30, practiceMinutes: 25, learnResources: [makeResource('Classes and Objects', 'https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html', 'Java Documentation', 'Course/Guide', 'LEARN', { subject: 'Java', topic: 'OOP Basics' })], practiceResources: [makeResource('Java Inheritance', 'https://www.hackerrank.com/challenges/java-inheritance/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'OOP Basics' })], legacyTaskId: 'java-task-07' },
      { key: 'constructors', learnTitle: 'Constructors & Encapsulation', practiceTitle: 'Constructors & Encapsulation Practice', description: 'Initialize objects correctly and protect data with access design.', learnMinutes: 25, practiceMinutes: 25, learnResources: [makeResource('Constructors', 'https://docs.oracle.com/javase/tutorial/java/javaOO/constructors.html', 'Java Documentation', 'Tutorial', 'LEARN', { subject: 'Java', topic: 'Constructors & Encapsulation' })], practiceResources: [makeResource('Java Encapsulation Practice', 'https://www.hackerrank.com/challenges/java-stdin-stdout/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Constructors & Encapsulation' })], legacyTaskId: 'java-task-08' },
      { key: 'inheritance', learnTitle: 'Inheritance & Abstraction', practiceTitle: 'Inheritance & Abstraction Practice', description: 'Use inheritance and abstraction appropriately in well-structured code.', learnMinutes: 30, practiceMinutes: 25, learnResources: [makeResource('Inheritance', 'https://docs.oracle.com/javase/tutorial/java/IandI/subclasses.html', 'Java Documentation', 'Documentation', 'LEARN', { subject: 'Java', topic: 'Inheritance & Abstraction' })], practiceResources: [makeResource('Java Abstract Class', 'https://www.hackerrank.com/challenges/java-abstract-class/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Inheritance & Abstraction' })], legacyTaskId: 'java-task-09' },
      { key: 'polymorphism', learnTitle: 'Polymorphism & Interfaces', practiceTitle: 'Polymorphism & Interfaces Practice', description: 'Apply overriding and interface-based polymorphism.', learnMinutes: 30, practiceMinutes: 25, learnResources: [makeResource('Interfaces', 'https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html', 'Java Documentation', 'Tutorial', 'LEARN', { subject: 'Java', topic: 'Polymorphism & Interfaces' })], practiceResources: [makeResource('Java Interface', 'https://www.hackerrank.com/challenges/java-interface/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Polymorphism & Interfaces' })], legacyTaskId: 'java-task-10' },
      { key: 'collections', learnTitle: 'Collections', practiceTitle: 'Collections Practice', description: 'Choose and use lists, sets, maps, and queues.', learnMinutes: 35, practiceMinutes: 30, learnResources: [makeResource('Collections Overview', 'https://docs.oracle.com/javase/8/docs/guide/collections/overview.html', 'Java Documentation', 'Documentation', 'LEARN', { subject: 'Java', topic: 'Collections' })], practiceResources: [makeResource('Java ArrayList', 'https://www.hackerrank.com/challenges/java-arraylist/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Collections' })], legacyTaskId: 'java-task-11' },
      { key: 'exceptions', learnTitle: 'Exception Handling', practiceTitle: 'Exception Handling Practice', description: 'Handle errors with exceptions and resource-safe patterns.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Exceptions', 'https://docs.oracle.com/javase/tutorial/essential/exceptions/', 'Java Documentation', 'Tutorial', 'LEARN', { subject: 'Java', topic: 'Exception Handling' })], practiceResources: [makeResource('Java Exception Handling', 'https://www.hackerrank.com/challenges/java-exception-handling/problem', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'Java', topic: 'Exception Handling' })], legacyTaskId: 'java-task-12' },
    ],
  },
  {
    id: 'dsa',
    name: 'DSA',
    track: 'Secondary',
    prerequisiteTaskId: 'python-task-04',
    module: 'DSA 2.01 — Arrays, Strings, Search & Sort',
    pairedTopics: [
      { key: 'complexity', learnTitle: 'Complexity Basics', practiceTitle: 'Complexity Practice', description: 'Estimate time and space complexity with Big O.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Big O Cheat Sheet', 'https://www.bigocheatsheet.com/', 'Other reputable source', 'Reference', 'LEARN', { subject: 'DSA', topic: 'Complexity Basics' })], practiceResources: [makeResource('Two Sum', 'https://leetcode.com/problems/two-sum/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Complexity Basics' })], legacyTaskId: 'dsa-task-01' },
      { key: 'arrays', learnTitle: 'Arrays & Matrices', practiceTitle: 'Arrays & Matrices Practice', description: 'Solve traversal, frequency, prefix/suffix, and matrix problems.', learnMinutes: 30, practiceMinutes: 20, learnResources: [makeResource('Array Introduction', 'https://www.geeksforgeeks.org/array-data-structure/', 'GeeksforGeeks', 'Tutorial', 'LEARN', { subject: 'DSA', topic: 'Arrays & Matrices' })], practiceResources: [makeResource('Two Sum', 'https://leetcode.com/problems/two-sum/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Arrays & Matrices' }), makeResource('Rotate Image', 'https://leetcode.com/problems/rotate-image/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Arrays & Matrices' })], legacyTaskId: 'dsa-task-02' },
      { key: 'twopointers', learnTitle: 'Two Pointers', practiceTitle: 'Two Pointers Practice', description: 'Apply pointer movement to efficient array and string solutions.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Two Pointers Explained', 'https://www.geeksforgeeks.org/two-pointers-technique/', 'GeeksforGeeks', 'Tutorial', 'LEARN', { subject: 'DSA', topic: 'Two Pointers' })], practiceResources: [makeResource('Container With Most Water', 'https://leetcode.com/problems/container-with-most-water/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Two Pointers' }), makeResource('3Sum', 'https://leetcode.com/problems/3sum/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Two Pointers' })], legacyTaskId: 'dsa-task-03' },
      { key: 'slidingwindow', learnTitle: 'Sliding Window', practiceTitle: 'Sliding Window Practice', description: 'Use windows to optimize contiguous subarray and substring problems.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Sliding Window Pattern', 'https://www.geeksforgeeks.org/window-sliding-technique/', 'GeeksforGeeks', 'Tutorial', 'LEARN', { subject: 'DSA', topic: 'Sliding Window' })], practiceResources: [makeResource('Maximum Average Subarray I', 'https://leetcode.com/problems/maximum-average-subarray-i/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Sliding Window' }), makeResource('Longest Substring Without Repeating Characters', 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Sliding Window' })], legacyTaskId: 'dsa-task-04' },
      { key: 'stringshashing', learnTitle: 'Strings & Hashing', practiceTitle: 'Strings & Hashing Practice', description: 'Use maps and sets to solve string problems and pattern matching.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Hashing in Python and Java', 'https://www.geeksforgeeks.org/hashing-data-structure/', 'GeeksforGeeks', 'Tutorial', 'LEARN', { subject: 'DSA', topic: 'Strings & Hashing' })], practiceResources: [makeResource('Valid Anagram', 'https://leetcode.com/problems/valid-anagram/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Strings & Hashing' }), makeResource('Group Anagrams', 'https://leetcode.com/problems/group-anagrams/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Strings & Hashing' })], legacyTaskId: 'dsa-task-05' },
      { key: 'searching', learnTitle: 'Searching', practiceTitle: 'Searching Practice', description: 'Use binary search and search-space reasoning to find answers efficiently.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Binary Search', 'https://www.geeksforgeeks.org/binary-search/', 'GeeksforGeeks', 'Tutorial', 'LEARN', { subject: 'DSA', topic: 'Searching' })], practiceResources: [makeResource('Binary Search', 'https://leetcode.com/problems/binary-search/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Searching' }), makeResource('Search Insert Position', 'https://leetcode.com/problems/search-insert-position/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Searching' })], legacyTaskId: 'dsa-task-06' },
      { key: 'sorting', learnTitle: 'Sorting', practiceTitle: 'Sorting Practice', description: 'Choose and reason about core sorting strategies and their trade-offs.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Merge Sort', 'https://www.geeksforgeeks.org/merge-sort/', 'GeeksforGeeks', 'Tutorial', 'LEARN', { subject: 'DSA', topic: 'Sorting' })], practiceResources: [makeResource('Merge Intervals', 'https://leetcode.com/problems/merge-intervals/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Sorting' }), makeResource('Sort Colors', 'https://leetcode.com/problems/sort-colors/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Sorting' })], legacyTaskId: 'dsa-task-07' },
      { key: 'linkedlists', learnTitle: 'Linked Lists', practiceTitle: 'Linked Lists Practice', description: 'Build and traverse singly linked structures and common patterns.', learnMinutes: 30, practiceMinutes: 25, learnResources: [makeResource('Linked List Data Structure', 'https://www.geeksforgeeks.org/data-structures/linked-list/', 'GeeksforGeeks', 'Course/Guide', 'LEARN', { subject: 'DSA', topic: 'Linked Lists' })], practiceResources: [makeResource('Reverse Linked List', 'https://leetcode.com/problems/reverse-linked-list/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Linked Lists' }), makeResource('Linked List Cycle', 'https://leetcode.com/problems/linked-list-cycle/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Linked Lists' })], legacyTaskId: 'dsa-task-08' },
      { key: 'stacksqueues', learnTitle: 'Stacks & Queues', practiceTitle: 'Stacks & Queues Practice', description: 'Apply linear data structures to common queue and stack patterns.', learnMinutes: 25, practiceMinutes: 20, learnResources: [makeResource('Stack and Queue', 'https://www.geeksforgeeks.org/stack-data-structure/', 'GeeksforGeeks', 'Tutorial', 'LEARN', { subject: 'DSA', topic: 'Stacks & Queues' })], practiceResources: [makeResource('Valid Parentheses', 'https://leetcode.com/problems/valid-parentheses/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Stacks & Queues' }), makeResource('Implement Queue using Stacks', 'https://leetcode.com/problems/implement-queue-using-stacks/', 'LeetCode', 'Practice Problem', 'PRACTICE', { subject: 'DSA', topic: 'Stacks & Queues' })], legacyTaskId: 'dsa-task-09' },
    ],
  },
  {
    id: 'sql',
    name: 'SQL',
    track: 'Primary',
    prerequisiteTaskId: 'python-task-06',
    roadmapOrder: 3,
    module: 'SQL — Joins + Multi-Table Queries',
    pairedTopics: [
      { key: 'select-where', learnTitle: 'SELECT / WHERE', practiceTitle: 'SELECT / WHERE Practice', description: 'Select columns and filter rows with predicates.', learnMinutes: 20, practiceMinutes: 20, learnResources: [makeResource('SQL SELECT', 'https://www.w3schools.com/sql/sql_select.asp', 'SQL reference/practice', 'Documentation', 'LEARN', { subject: 'SQL', topic: 'SELECT / WHERE' })], practiceResources: [makeResource('SQL WHERE practice', 'https://www.hackerrank.com/domains/sql', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'SQL', topic: 'SELECT / WHERE' })], legacyTaskId: 'sql-task-01' },
      { key: 'join', learnTitle: 'JOIN', practiceTitle: 'JOIN Practice', description: 'Combine related tables using common joins and multi-table queries.', learnMinutes: 25, practiceMinutes: 25, learnResources: [makeResource('SQL JOIN', 'https://www.w3schools.com/sql/sql_join.asp', 'SQL reference/practice', 'Tutorial', 'LEARN', { subject: 'SQL', topic: 'JOIN' })], practiceResources: [makeResource('SQL JOIN Problems', 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=join', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'SQL', topic: 'JOIN' })], legacyTaskId: 'sql-task-02' },
      { key: 'groupby', learnTitle: 'GROUP BY & Aggregates', practiceTitle: 'GROUP BY & Aggregates Practice', description: 'Summarize rows with grouping and aggregate functions.', learnMinutes: 25, practiceMinutes: 25, learnResources: [makeResource('GROUP BY', 'https://www.w3schools.com/sql/sql_groupby.asp', 'SQL reference/practice', 'Documentation', 'LEARN', { subject: 'SQL', topic: 'GROUP BY & Aggregates' })], practiceResources: [makeResource('Aggregate SQL Practice', 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=aggregation', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'SQL', topic: 'GROUP BY & Aggregates' })], legacyTaskId: 'sql-task-03' },
      { key: 'subqueries', learnTitle: 'Subqueries', practiceTitle: 'Subqueries Practice', description: 'Use nested queries to express dependent lookups.', learnMinutes: 30, practiceMinutes: 25, learnResources: [makeResource('SQL Subqueries', 'https://www.w3schools.com/sql/sql_subqueries.asp', 'SQL reference/practice', 'Tutorial', 'LEARN', { subject: 'SQL', topic: 'Subqueries' })], practiceResources: [makeResource('Subquery Practice', 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=select', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'SQL', topic: 'Subqueries' })], legacyTaskId: 'sql-task-04' },
    ],
  },
  {
    id: 'dbms',
    name: 'DBMS',
    track: 'Secondary',
    prerequisiteTaskId: 'sql-subqueries-practice',
    module: 'DBMS — Relational Design & Transactions',
    topics: [
      { title: 'Relational Model', type: 'Learn', minutes: 25, description: 'Understand relations, keys, and integrity constraints.' },
      { title: 'Normalization', type: 'Learn', minutes: 30, description: 'Reason about functional dependencies and normal forms.' },
      { title: 'Transactions & ACID', type: 'Revision', minutes: 25, description: 'Review transaction guarantees and isolation basics.' },
    ],
  },
  {
    id: 'git-github',
    name: 'Git/GitHub',
    track: 'Primary',
    roadmapOrder: 2,
    module: 'Version Control',
    topics: [
      { title: 'Git Basics', type: 'Learn', minutes: 20, description: 'Track changes with repositories, commits, and status.' },
      { title: 'Branches & Merges', type: 'Practice', minutes: 25, description: 'Work with branches and resolve a simple merge.' },
      { title: 'GitHub Collaboration', type: 'Practice', minutes: 25, description: 'Use remotes and pull requests in a shared workflow.' },
      { title: 'Inspecting Changes', type: 'Practice', minutes: 15, description: 'Inspect status, diffs, and commit history.' },
      { title: 'Undoing Local Changes', type: 'Practice', minutes: 15, description: 'Restore files and safely unstage changes.' },
      { title: 'Resolving Merge Conflicts', type: 'Practice', minutes: 15, description: 'Resolve a small conflict and verify the result.' },
      { title: 'Ignore Rules and Secrets', type: 'Practice', minutes: 15, description: 'Configure ignore rules and keep credentials out of commits.' },
      { title: 'Pull Request Review', type: 'Practice', minutes: 15, description: 'Prepare and review a focused pull request.' },
    ],
  },
  {
    id: 'operating-systems',
    name: 'Operating Systems',
    track: 'Secondary',
    module: 'Operating System Concepts',
    topics: [
      { title: 'Processes & Threads', type: 'Learn', minutes: 30, description: 'Compare processes, threads, and their execution state.' },
      { title: 'Scheduling & Concurrency', type: 'Practice', minutes: 30, description: 'Explore scheduling and synchronization fundamentals.' },
      { title: 'Memory Management', type: 'Learn', minutes: 30, description: 'Study virtual memory, paging, and address translation.' },
      { title: 'Process Lifecycle', type: 'Practice', minutes: 15, description: 'Trace process creation, states, and termination.' },
      { title: 'Concurrency and Synchronization', type: 'Practice', minutes: 15, description: 'Identify a race condition and a synchronization strategy.' },
      { title: 'File Systems', type: 'Learn', minutes: 15, description: 'Explore files, directories, permissions, and storage.' },
      { title: 'Virtual Memory Practice', type: 'Practice', minutes: 15, description: 'Trace a simple page access and page fault.' },
      { title: 'OS Concepts Review', type: 'Practice', minutes: 15, description: 'Apply process, memory, and file concepts to a scenario.' },
    ],
  },
  {
    id: 'computer-networks',
    name: 'Computer Networks',
    track: 'Secondary',
    module: 'Network Foundations',
    topics: [
      { title: 'Network Layers', type: 'Learn', minutes: 25, description: 'Map common protocols to network layers.' },
      { title: 'TCP and UDP', type: 'Revision', minutes: 25, description: 'Compare transport protocols and their trade-offs.' },
      { title: 'HTTP & DNS', type: 'Learn', minutes: 30, description: 'Trace a web request through DNS and HTTP.' },
      { title: 'IP Addressing', type: 'Learn', minutes: 15, description: 'Understand IP addresses and basic routing.' },
      { title: 'Ports and Sockets', type: 'Practice', minutes: 15, description: 'Trace a client connection through a port and socket.' },
      { title: 'HTTP Request Practice', type: 'Practice', minutes: 15, description: 'Inspect request methods, headers, and response status codes.' },
      { title: 'TLS Basics', type: 'Learn', minutes: 15, description: 'Explain what HTTPS and TLS protect.' },
      { title: 'Network Troubleshooting', type: 'Practice', minutes: 15, description: 'Trace DNS resolution and connectivity problems.' },
      { title: 'Network Foundations Review', type: 'Practice', minutes: 15, description: 'Connect network layers, transport, DNS, and HTTP in one example.' },
    ],
  },
  {
    id: 'oop',
    name: 'OOP',
    track: 'Secondary',
    prerequisiteTaskId: 'java-exceptions-practice',
    module: 'Object-Oriented Design',
    topics: [
      { title: 'Encapsulation & Abstraction', type: 'Learn', minutes: 25, description: 'Design clear object boundaries and public contracts.' },
      { title: 'Inheritance & Composition', type: 'Revision', minutes: 25, description: 'Choose composition or inheritance for a design.' },
      { title: 'Polymorphism & Interfaces', type: 'Practice', minutes: 30, description: 'Use interfaces to separate behavior from implementation.' },
    ],
  },
  {
    id: 'backend-development',
    name: 'Backend Development',
    track: 'Secondary',
    prerequisiteTaskId: 'dbms-task-03',
    module: 'Backend 9.01 — REST APIs + Spring Boot',
    topics: [
      { title: 'HTTP & REST', type: 'Learn', minutes: 30, description: 'Design resource-oriented API endpoints and request flow.' },
      { title: 'Validation & Errors', type: 'Practice', minutes: 30, description: 'Validate input and return consistent errors.' },
      { title: 'Spring Boot Foundations', type: 'Learn', minutes: 35, description: 'Understand controllers, services, dependency injection, and application wiring.' },
      { title: 'Persistence Basics', type: 'Learn', minutes: 35, description: 'Connect application logic to persistent storage concepts and JPA/Hibernate later.' },
    ],
  },
  {
    id: 'system-design',
    name: 'System Design Fundamentals',
    track: 'Secondary',
    prerequisiteTaskId: 'backend-development-task-04',
    module: 'System Design Foundations',
    topics: [
      { title: 'Requirements & Estimation', type: 'Learn', minutes: 30, description: 'Clarify requirements and estimate basic system load.' },
      { title: 'APIs & Data Modeling', type: 'Practice', minutes: 30, description: 'Sketch API contracts and a simple data model.' },
      { title: 'Caching & Scaling Basics', type: 'Learn', minutes: 35, description: 'Explore caching, bottlenecks, and horizontal scaling.' },
    ],
  },
  {
    id: 'python',
    name: 'Python',
    track: 'Primary',
    roadmapOrder: 1,
    module: 'Python Foundations',
    topics: [
      { taskId: 'python-task-01', title: 'Python Basics', type: 'Learn', minutes: 25, description: 'Start with Python syntax, values, variables, and built-in data types.' },
      { taskId: 'python-task-04', title: 'Control Flow & Strings', type: 'Practice', minutes: 30, description: 'Study conditionals, loops, and strings, then use them in short exercises.' },
      { taskId: 'python-task-02', title: 'Functions & Collections', type: 'Practice', minutes: 30, description: 'Study functions and built-in collections, then write functions that transform lists, tuples, sets, and dictionaries.' },
      { taskId: 'python-task-03', title: 'Modules & Environments', type: 'Practice', minutes: 25, description: 'Organize code and work with modules, packages, and project environments.' },
      { taskId: 'python-task-05', title: 'Files & Exceptions', type: 'Practice', minutes: 30, description: 'Read and write files and handle failures with clear exception paths.' },
      { taskId: 'python-task-06', title: 'Python OOP', type: 'Learn', minutes: 30, description: 'Model state and behavior with Python classes and objects.' },
      { title: 'Python Basics Practice', type: 'Practice', minutes: 30, description: 'Practice expressions, conditions, loops, and strings.' },
      { title: 'Collections Practice', type: 'Practice', minutes: 30, description: 'Solve small problems with lists, dictionaries, and sets.' },
      { title: 'Functions and Modules Practice', type: 'Practice', minutes: 30, description: 'Build reusable functions and import them from a module.' },
      { title: 'Files and Exceptions Practice', type: 'Practice', minutes: 30, description: 'Read a file, validate input, and handle errors.' },
      { title: 'Intermediate Python: Comprehensions', type: 'Learn', minutes: 30, description: 'Use comprehensions to transform and filter collections.' },
      { title: 'Comprehensions Practice', type: 'Practice', minutes: 30, description: 'Refactor loops into readable comprehensions.' },
      { title: 'Intermediate Python: Iterators', type: 'Learn', minutes: 30, description: 'Understand iterables, iterators, and generators.' },
      { title: 'Iterators Practice', type: 'Practice', minutes: 30, description: 'Write and use a simple generator.' },
      { title: 'Intermediate Python: OOP Practice', type: 'Practice', minutes: 30, description: 'Build a small class with methods and composition.' },
      { title: 'Useful Libraries: Standard Library', type: 'Learn', minutes: 30, description: 'Use pathlib, json, and collections for everyday tasks.' },
      { title: 'Standard Library Practice', type: 'Practice', minutes: 30, description: 'Read JSON and summarize records with standard-library tools.' },
      { title: 'Useful Libraries: NumPy', type: 'Learn', minutes: 30, description: 'Explore arrays, shapes, and vectorized operations.' },
      { title: 'NumPy Practice', type: 'Practice', minutes: 30, description: 'Transform and summarize arrays.' },
      { title: 'Useful Libraries: Pandas', type: 'Learn', minutes: 30, description: 'Explore data frames, selection, and summaries.' },
      { title: 'Pandas Practice', type: 'Practice', minutes: 30, description: 'Clean and summarize a small table.' },
      { title: 'AI/ML Concepts and Tools', type: 'Learn', minutes: 30, description: 'Explore features, labels, training, evaluation, and introductory model tools.' },
      { title: 'AI/ML Introductory Practice', type: 'Practice', minutes: 30, description: 'Prepare a small dataset and reason about a baseline model.' },
      { title: 'Problem Solving: Strings and Collections', type: 'Problem Solving', minutes: 30, description: 'Solve a focused string and collection challenge.' },
      { title: 'Problem Solving: Data and Functions', type: 'Problem Solving', minutes: 30, description: 'Solve a small data-processing problem using functions and prior topics.' },
    ],
  },
  {
    id: 'numpy-pandas',
    name: 'NumPy/Pandas',
    track: 'Primary',
    prerequisiteTaskId: 'python-task-06',
    roadmapOrder: 4,
    module: 'Data Analysis Tools',
    topics: [
      { title: 'NumPy Arrays', type: 'Learn', minutes: 30, description: 'Create arrays and use vectorized operations.' },
      { title: 'Pandas DataFrames', type: 'Practice', minutes: 30, description: 'Load, inspect, and transform tabular data.' },
      { title: 'Cleaning & Summaries', type: 'Problem Solving', minutes: 30, description: 'Clean missing values and produce grouped summaries.' },
    ],
  },
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    track: 'Primary',
    prerequisiteTaskId: 'math-statistics-task-03',
    roadmapOrder: 6,
    module: 'Machine Learning Fundamentals',
    topics: [
      { title: 'Learning Problem Types', type: 'Learn', minutes: 30, description: 'Distinguish supervised and unsupervised learning.' },
      { title: 'Features & Evaluation', type: 'Learn', minutes: 30, description: 'Prepare features and choose basic evaluation measures.' },
      { title: 'Baseline Model Practice', type: 'Practice', minutes: 35, description: 'Train and evaluate a simple baseline model.' },
      { title: 'Scikit-learn Workflow', type: 'Practice', minutes: 30, description: 'Split data, fit a baseline, validate, and interpret evaluation metrics.' },
    ],
  },
  {
    id: 'nlp',
    name: 'NLP',
    track: 'Primary',
    prerequisiteTaskId: 'machine-learning-task-03',
    roadmapOrder: 7,
    module: 'Natural Language Processing',
    topics: [
      { title: 'Text Preprocessing', type: 'Learn', minutes: 25, description: 'Normalize and tokenize text for analysis.' },
      { title: 'Text Representations', type: 'Learn', minutes: 30, description: 'Compare sparse and embedding-based representations.' },
    ],
  },
  {
    id: 'llm-fundamentals',
    name: 'LLM Fundamentals',
    track: 'Primary',
    prerequisiteTaskId: 'machine-learning-task-03',
    roadmapOrder: 11,
    module: 'Large Language Models',
    topics: [
      { title: 'Tokens & Context Windows', type: 'Learn', minutes: 25, description: 'Understand tokenization and context limits.' },
      { title: 'Prompting & Model Limits', type: 'Practice', minutes: 30, description: 'Evaluate prompts and recognize model limitations.' },
    ],
  },
  {
    id: 'rag',
    name: 'RAG',
    track: 'Primary',
    prerequisiteTaskId: 'applied-ai-core-task-06',
    roadmapOrder: 13,
    module: 'Retrieval-Augmented Generation',
    topics: [
      { title: 'Retrieval Pipeline', type: 'Learn', minutes: 30, description: 'Trace chunking, embeddings, retrieval, and grounded generation.' },
      { title: 'RAG Evaluation', type: 'Practice', minutes: 30, description: 'Inspect retrieval quality and answer grounding.' },
    ],
  },
  {
    id: 'fastapi',
    name: 'FastAPI',
    track: 'Primary',
    prerequisiteTaskId: 'python-task-06',
    roadmapOrder: 12,
    module: 'FastAPI Foundations',
    topics: [
      { title: 'Routes & Schemas', type: 'Learn', minutes: 30, description: 'Define typed request and response models.' },
      { title: 'Async Endpoints', type: 'Practice', minutes: 30, description: 'Build and reason about asynchronous endpoints.' },
    ],
  },
  {
    id: 'mlops',
    name: 'MLOps Fundamentals',
    track: 'Primary',
    prerequisiteTaskId: 'rag-task-02',
    roadmapOrder: 14,
    module: 'MLOps Foundations',
    topics: [
      { title: 'Experiment Tracking', type: 'Learn', minutes: 30, description: 'Record model parameters, metrics, and artifacts.' },
      { title: 'Model Serving & Monitoring', type: 'Learn', minutes: 35, description: 'Review deployment and basic model monitoring.' },
    ],
  },
  {
    id: 'math-statistics',
    name: 'Math & Statistics',
    track: 'Primary',
    prerequisiteTaskId: 'numpy-pandas-task-03',
    roadmapOrder: 5,
    module: 'Common Software and Data Foundations',
    topics: [
      { title: 'Linear Algebra Essentials', type: 'Learn', minutes: 30, description: 'Review vectors, matrices, and the operations used in machine learning.' },
      { title: 'Probability & Distributions', type: 'Learn', minutes: 30, description: 'Reason about probability, common distributions, and uncertainty.' },
      { title: 'Statistics for Evaluation', type: 'Practice', minutes: 30, description: 'Use summary statistics and sampling ideas when interpreting model results.' },
    ],
  },
  {
    id: 'neural-networks',
    name: 'Neural Networks',
    track: 'Primary',
    prerequisiteTaskId: 'machine-learning-task-03',
    roadmapOrder: 8,
    module: 'AI/ML Foundations',
    topics: [
      { title: 'Neural Network Basics', type: 'Learn', minutes: 35, description: 'Understand layers, activations, forward passes, and loss functions.' },
      { title: 'Training & Generalization', type: 'Learn', minutes: 35, description: 'Study gradients, optimization, overfitting, and regularization.' },
    ],
  },
  {
    id: 'pytorch',
    name: 'PyTorch Basics',
    track: 'Primary',
    prerequisiteTaskId: 'neural-networks-task-02',
    roadmapOrder: 9,
    module: 'AI/ML Foundations',
    topics: [
      { title: 'Tensors & Autograd', type: 'Learn', minutes: 35, description: 'Work with tensors and automatic differentiation concepts.' },
      { title: 'Training Loop Basics', type: 'Practice', minutes: 40, description: 'Structure a small model, loss, optimizer, and training loop.' },
    ],
  },
  {
    id: 'transformer-attention',
    name: 'Transformers & Attention',
    track: 'Primary',
    prerequisiteTaskId: 'pytorch-task-02',
    roadmapOrder: 10,
    module: 'AI/ML Foundations',
    topics: [
      { title: 'Attention Fundamentals', type: 'Learn', minutes: 35, description: 'Understand queries, keys, values, and attention scores.' },
      { title: 'Transformer Architecture', type: 'Learn', minutes: 35, description: 'Trace embeddings, attention blocks, feed-forward layers, and residual paths.' },
      { title: 'Transformer Model Use', type: 'Practice', minutes: 35, description: 'Connect transformer fundamentals to practical language-model behavior.' },
    ],
  },
  {
    id: 'applied-ai-core',
    name: 'Applied AI Core',
    track: 'Primary',
    prerequisiteTaskId: 'llm-fundamentals-task-02',
    roadmapOrder: 12,
    module: 'Applied AI Core',
    topics: [
      { title: 'Model APIs', type: 'Practice', minutes: 30, description: 'Design dependable application boundaries around model API calls.' },
      { title: 'Structured Outputs', type: 'Practice', minutes: 30, description: 'Constrain and validate model responses against application schemas.' },
      { title: 'Tool Use', type: 'Practice', minutes: 35, description: 'Connect models to explicit tools with validated inputs and outputs.' },
      { title: 'Applied AI Evaluation', type: 'Practice', minutes: 35, description: 'Build task-specific checks for quality, grounding, and regressions.' },
      { title: 'Reliability & Guardrails', type: 'Learn', minutes: 30, description: 'Plan retries, fallbacks, validation, and safe failure behavior.' },
      { title: 'Deployment & Observability', type: 'Learn', minutes: 35, description: 'Track latency, errors, cost, and quality in deployed AI systems.' },
    ],
  },
  {
    id: 'generative-ai-specialization',
    name: 'Generative AI Engineer',
    track: 'Primary',
    lane: 'Generative AI',
    prerequisiteTaskId: 'mlops-task-02',
    roadmapOrder: 1,
    module: 'Generative AI Specialization',
    topics: [
      { title: 'Prompting & Structured Generation', type: 'Practice', minutes: 35, description: 'Design prompts and structured generation flows for repeatable application behavior.' },
      { title: 'RAG & Context Systems', type: 'Practice', minutes: 40, description: 'Design context assembly, retrieval, grounding, and citation behavior.' },
      { title: 'Agents & Tool Use', type: 'Practice', minutes: 40, description: 'Orchestrate bounded agent loops and tools with explicit state and stopping rules.' },
      { title: 'Fine-Tuning Decision Basics', type: 'Learn', minutes: 30, description: 'Evaluate fine-tuning later when prompting, retrieval, and tools are insufficient.' },
      { title: 'Generative AI Evaluation', type: 'Practice', minutes: 35, description: 'Evaluate correctness, groundedness, safety, and task success.' },
      { title: 'Generative AI Production', type: 'Practice', minutes: 40, description: 'Prepare scalable, observable, and cost-aware generative AI services.' },
    ],
  },
  {
    id: 'voice-ai-specialization',
    name: 'Voice AI / Conversational AI Engineer',
    track: 'Primary',
    lane: 'Voice AI',
    prerequisiteTaskId: 'mlops-task-02',
    roadmapOrder: 1,
    module: 'Voice AI / Conversational AI Specialization',
    topics: [
      { title: 'STT / ASR Pipelines', type: 'Learn', minutes: 35, description: 'Understand streaming speech recognition, transcription quality, and endpointing.' },
      { title: 'TTS Pipelines', type: 'Learn', minutes: 35, description: 'Understand speech synthesis, voice output controls, and streaming playback.' },
      { title: 'Dialogue Management', type: 'Practice', minutes: 40, description: 'Design dialogue policies, recovery behavior, and clear conversation goals.' },
      { title: 'Conversation State', type: 'Practice', minutes: 35, description: 'Track short-term context, user state, and durable conversation memory safely.' },
      { title: 'Multilingual Conversations', type: 'Learn', minutes: 30, description: 'Handle language detection, switching, locale behavior, and multilingual evaluation.' },
      { title: 'Turn-Taking & Latency', type: 'Practice', minutes: 40, description: 'Manage interruptions, endpointing, response timing, and perceived latency.' },
      { title: 'Voice-System Evaluation', type: 'Practice', minutes: 35, description: 'Evaluate recognition, synthesis, task success, latency, and conversational recovery.' },
      { title: 'Voice AI Deployment', type: 'Practice', minutes: 40, description: 'Deploy and observe a real-time voice pipeline with reliability and cost controls.' },
    ],
  },
  {
    id: 'portfolio-work', name: 'Portfolio Project Work', track: 'Primary',
    prerequisiteTaskId: 'applied-ai-core-task-01', roadmapOrder: 15,
    module: 'Portfolio and Application Preparation',
    topics: [
      { title: 'Plan an AI or Voice Project', type: 'Project Work', minutes: 30, description: 'Choose an existing project if available; define its user problem, scope, and measurable success criteria.' },
      { title: 'Project Implementation Session', type: 'Project Work', minutes: 45, description: 'Build and run a small end-to-end feature in your existing project; continue as needed.' },
      { title: 'Project Evaluation Session', type: 'Project Work', minutes: 45, description: 'Create representative test cases and record quality, failures, and limitations.' },
      { title: 'Project Documentation Session', type: 'Project Work', minutes: 30, description: 'Work on a clear README, setup instructions, demo, and evaluation notes.' },
      { title: 'Resume and GitHub Review', type: 'Practice', minutes: 30, description: 'Review evidence, links, project explanations, and resume accuracy.' },
      { title: 'Internship Interview Practice', type: 'Practice', minutes: 30, description: 'Explain Python, one project, complexity, and introductory ML in a mock interview.' },
    ],
  },
  {
    id: 'data-visualization', name: 'Data Visualization', track: 'Primary',
    prerequisiteTaskId: 'numpy-pandas-task-03', roadmapOrder: 5,
    module: 'Data and ML Foundations',
    topics: [
      { title: 'Plotting and Visual Interpretation', type: 'Learn', minutes: 30, description: 'Choose plots and interpret distributions, trends, and outliers.' },
      { title: 'Visualize a Dataset', type: 'Practice', minutes: 30, description: 'Build and explain a small visualization from tabular data.' },
    ],
  },
  {
    id: 'full-time-preparation', name: 'Full-Time Preparation', track: 'Primary',
    prerequisiteTaskId: 'voice-ai-specialization-task-08', roadmapOrder: 99,
    module: 'Entry-Level Application Preparation',
    topics: [
      { title: 'API Testing and Deployment Practice', type: 'Practice', minutes: 45, description: 'Exercise API validation, automated tests, deployment, and error handling.' },
      { title: 'Deeper GenAI Evaluation', type: 'Practice', minutes: 45, description: 'Evaluate retrieval, response quality, regressions, reliability, and failure cases.' },
      { title: 'Second Project Planning Session', type: 'Project Work', minutes: 30, description: 'Choose an existing suitable project where possible and plan a distinct portfolio contribution.' },
      { title: 'Second Project Build Session', type: 'Project Work', minutes: 45, description: 'Advance a working feature; plan further implementation time as needed.' },
      { title: 'Second Project Evaluation Session', type: 'Project Work', minutes: 45, description: 'Add tests, evaluation, a README, and demo evidence; continue polishing as needed.' },
      { title: 'Full-Time Mock Interview', type: 'Practice', minutes: 45, description: 'Practice Python, DSA, systems, and a project walkthrough; review feedback.' },
    ],
  },
]

const resourceCoverage: Record<string, PracticeResource[]> = {
  'dbms-task-01': [makeResource('Relational Model in DBMS', 'https://www.geeksforgeeks.org/dbms/relational-model-in-dbms/', 'GeeksforGeeks', 'Tutorial', 'LEARN')],
  'dbms-task-02': [makeResource('Database Normalization', 'https://www.geeksforgeeks.org/dbms/database-normalization-normal-forms/', 'GeeksforGeeks', 'Tutorial', 'LEARN')],
  'dbms-task-03': [makeResource('PostgreSQL Transactions', 'https://www.postgresql.org/docs/current/tutorial-transactions.html', 'Official Documentation', 'Documentation', 'REFERENCE')],
  'operating-systems-task-01': [makeResource('Processes and Threads', 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf', 'Other reputable source', 'Course/Guide', 'LEARN')],
  'operating-systems-task-02': [makeResource('CPU Scheduling Exercises', 'https://github.com/remzi-arpacidusseau/ostep-homework', 'Other reputable source', 'Problem Set', 'PRACTICE', { difficulty: 'Intermediate' })],
  'operating-systems-task-03': [makeResource('Virtual Memory Introduction', 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf', 'Other reputable source', 'Course/Guide', 'LEARN')],
  'computer-networks-task-01': [makeResource('OSI Model', 'https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/', 'Other reputable source', 'Article', 'LEARN')],
  'computer-networks-task-02': [
    makeResource('TCP (Transmission Control Protocol)', 'https://developer.mozilla.org/en-US/docs/Glossary/TCP', 'MDN', 'Documentation', 'REFERENCE'),
    makeResource('UDP (User Datagram Protocol)', 'https://developer.mozilla.org/en-US/docs/Glossary/UDP', 'MDN', 'Documentation', 'REFERENCE'),
  ],
  'computer-networks-task-03': [
    makeResource('HTTP Overview', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', 'MDN', 'Documentation', 'LEARN'),
    makeResource('What Is DNS?', 'https://www.cloudflare.com/learning/dns/what-is-dns/', 'Other reputable source', 'Article', 'REFERENCE'),
  ],
  'backend-development-task-01': [makeResource('HTTP Overview', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', 'MDN', 'Documentation', 'LEARN')],
  'backend-development-task-02': [makeResource('Bean Validation', 'https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html', 'Official Documentation', 'Documentation', 'REFERENCE')],
  'backend-development-task-03': [makeResource('Building an Application with Spring Boot', 'https://spring.io/guides/gs/spring-boot', 'Official Documentation', 'Tutorial', 'LEARN')],
  'backend-development-task-04': [makeResource('Spring Data JPA Reference', 'https://docs.spring.io/spring-data/jpa/reference/', 'Official Documentation', 'Documentation', 'LEARN')],
  'git-github-task-01': [makeResource('Pro Git: Getting Started', 'https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control', 'Official Documentation', 'Course/Guide', 'LEARN')],
  'git-github-task-02': [makeResource('Learn Git Branching', 'https://learngitbranching.js.org/', 'Other reputable source', 'Practice Problem', 'PRACTICE', { difficulty: 'Beginner' })],
  'git-github-task-03': [makeResource('GitHub Pull Requests', 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests', 'Official Documentation', 'Documentation', 'PRACTICE', { difficulty: 'Beginner' })],
  'oop-task-01': [makeResource('Classes and Objects', 'https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html', 'Java Documentation', 'Tutorial', 'LEARN')],
  'oop-task-02': [makeResource('Composition over Inheritance', 'https://refactoring.guru/design-patterns/composition-over-inheritance', 'Other reputable source', 'Article', 'REFERENCE')],
  'oop-task-03': [makeResource('Interfaces and Inheritance', 'https://docs.oracle.com/javase/tutorial/java/IandI/index.html', 'Java Documentation', 'Tutorial', 'PRACTICE', { difficulty: 'Intermediate' })],
  'system-design-task-01': [makeResource('System Design Primer', 'https://github.com/donnemartin/system-design-primer', 'Other reputable source', 'Course/Guide', 'LEARN')],
  'system-design-task-02': [makeResource('RESTful API Guidelines', 'https://opensource.zalando.com/restful-api-guidelines/', 'Other reputable source', 'Reference', 'PRACTICE')],
  'system-design-task-03': [makeResource('System Design Primer: Scalability', 'https://github.com/donnemartin/system-design-primer#step-1-review-the-scalability-principles', 'Other reputable source', 'Course/Guide', 'LEARN')],
  'python-task-01': [makeResource('The Python Tutorial', 'https://docs.python.org/3/tutorial/index.html', 'Python Documentation', 'Tutorial', 'LEARN')],
  'python-task-02': [makeResource('HackerRank Python Practice', 'https://www.hackerrank.com/domains/python', 'HackerRank', 'Problem Set', 'PRACTICE', { difficulty: 'Beginner' })],
  'python-task-03': [makeResource('Python Modules', 'https://docs.python.org/3/tutorial/modules.html', 'Python Documentation', 'Documentation', 'REFERENCE')],
  'numpy-pandas-task-01': [makeResource('NumPy Quickstart', 'https://numpy.org/doc/stable/user/quickstart.html', 'Official Documentation', 'Tutorial', 'LEARN')],
  'numpy-pandas-task-02': [makeResource('Pandas Getting Started Tutorials', 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/', 'Official Documentation', 'Tutorial', 'LEARN')],
  'numpy-pandas-task-03': [makeResource('Pandas Exercises', 'https://github.com/guipsamora/pandas_exercises', 'Other reputable source', 'Problem Set', 'PRACTICE', { difficulty: 'Beginner' })],
  'machine-learning-task-01': [makeResource('Google Machine Learning: Framing', 'https://developers.google.com/machine-learning/problem-framing', 'Official Documentation', 'Course/Guide', 'LEARN')],
  'machine-learning-task-02': [makeResource('Scikit-learn: Cross-validation', 'https://scikit-learn.org/stable/modules/cross_validation.html', 'Official Documentation', 'Documentation', 'REFERENCE')],
  'machine-learning-task-03': [makeResource('Scikit-learn: Getting Started', 'https://scikit-learn.org/stable/getting_started.html', 'Official Documentation', 'Tutorial', 'PRACTICE', { difficulty: 'Beginner' })],
  'nlp-task-01': [makeResource('spaCy 101', 'https://spacy.io/usage/spacy-101', 'Official Documentation', 'Course/Guide', 'LEARN')],
  'nlp-task-02': [makeResource('Hugging Face NLP Course: Tokenizers', 'https://huggingface.co/learn/llm-course/chapter6/1', 'Other reputable source', 'Course/Guide', 'LEARN')],
  'llm-fundamentals-task-01': [makeResource('Hugging Face NLP Course: Tokenizers', 'https://huggingface.co/learn/llm-course/chapter6/1', 'Other reputable source', 'Course/Guide', 'LEARN')],
  'llm-fundamentals-task-02': [makeResource('OpenAI Prompt Engineering Guide', 'https://platform.openai.com/docs/guides/prompt-engineering', 'Official Documentation', 'Documentation', 'PRACTICE', { difficulty: 'Beginner' })],
  'rag-task-01': [makeResource('LangChain RAG Documentation', 'https://docs.langchain.com/oss/python/langchain/rag', 'Official Documentation', 'Documentation', 'LEARN')],
  'rag-task-02': [makeResource('Ragas Documentation', 'https://docs.ragas.io/en/stable/', 'Official Documentation', 'Documentation', 'PRACTICE', { difficulty: 'Intermediate' })],
  'fastapi-task-01': [makeResource('FastAPI First Steps', 'https://fastapi.tiangolo.com/tutorial/first-steps/', 'Official Documentation', 'Tutorial', 'LEARN')],
  'fastapi-task-02': [makeResource('FastAPI Concurrency and async / await', 'https://fastapi.tiangolo.com/async/', 'Official Documentation', 'Documentation', 'PRACTICE', { difficulty: 'Intermediate' })],
  'mlops-task-01': [makeResource('MLflow Tracking', 'https://mlflow.org/docs/latest/ml/tracking/', 'Official Documentation', 'Documentation', 'LEARN')],
  'mlops-task-02': [makeResource('MLOps: Continuous Delivery and Automation Pipelines', 'https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning', 'Official Documentation', 'Course/Guide', 'LEARN')],
}

function attachMissingResources(subjects: Subject[]): Subject[] {
  return subjects.map((subject) => ({
    ...subject,
    modules: subject.modules.map((module) => ({
      ...module,
      topics: module.topics.map((topic) => ({
        ...topic,
        tasks: topic.tasks.map((task) => {
          const hasResource = task.practiceResources?.some((resource) => resource.title && resource.url && resource.usage)
          const additions: PracticeResource[] = []
          if (subject.id === 'python') additions.push(makeResource(task.type === 'Learn' ? 'Python Tutorial' : 'Python Practice', task.type === 'Learn' ? 'https://docs.python.org/3/tutorial/' : 'https://www.hackerrank.com/domains/python', task.type === 'Learn' ? 'Python Documentation' : 'HackerRank', task.type === 'Learn' ? 'Tutorial' : 'Problem Set', task.type === 'Learn' ? 'LEARN' : 'PRACTICE'))
          if (subject.id === 'dsa') additions.push(makeResource('LeetCode Study Plans', 'https://leetcode.com/studyplan/', 'LeetCode', 'Problem Set', 'PRACTICE'))
          if (['numpy-pandas', 'data-visualization', 'machine-learning'].includes(subject.id)) additions.push(makeResource('Kaggle Learn', 'https://www.kaggle.com/learn/', 'Other reputable source', 'Course/Guide', 'PRACTICE'))
          if (subject.id === 'git-github') additions.push(makeResource('Pro Git', 'https://git-scm.com/book/en/v2', 'Official Documentation', 'Course/Guide', 'LEARN'))
          if (subject.id === 'machine-learning') additions.push(makeResource('scikit-learn Getting Started', 'https://scikit-learn.org/stable/getting_started', 'Official Documentation', 'Tutorial', 'PRACTICE'))
          if (subject.id === 'pytorch') additions.push(makeResource('PyTorch Basics', 'https://docs.pytorch.org/tutorials/beginner/basics/intro', 'Official Documentation', 'Tutorial', 'PRACTICE'))
          if (subject.id === 'fastapi') additions.push(makeResource('FastAPI Tutorial', 'https://fastapi.tiangolo.com/tutorial/', 'Official Documentation', 'Tutorial', 'PRACTICE'))
          const existing = hasResource ? task.practiceResources ?? [] : resourceCoverage[task.id] ?? []
          return { ...task, practiceResources: [...existing, ...additions.filter((addition) => !existing.some((resource) => resource.url === addition.url))] }
        }),
      })),
    })),
  }))
}

export const legacyTaskMap: Record<string, string> = {
  'java-task-01': 'java-basics-learn',
  'java-task-02': 'java-variables-learn',
  'java-task-03': 'java-ifelse-learn',
  'java-task-04': 'java-methods-learn',
  'java-task-05': 'java-arrays-learn',
  'java-task-06': 'java-strings-learn',
  'java-task-07': 'java-oop-learn',
  'java-task-08': 'java-constructors-learn',
  'java-task-09': 'java-inheritance-learn',
  'java-task-10': 'java-polymorphism-learn',
  'java-task-11': 'java-collections-learn',
  'java-task-12': 'java-exceptions-learn',
  'dsa-task-01': 'dsa-complexity-learn',
  'dsa-task-02': 'dsa-arrays-learn',
  'dsa-task-03': 'dsa-twopointers-learn',
  'dsa-task-04': 'dsa-slidingwindow-learn',
  'dsa-task-05': 'dsa-stringshashing-learn',
  'dsa-task-06': 'dsa-searching-learn',
  'dsa-task-07': 'dsa-sorting-learn',
  'dsa-task-08': 'dsa-linkedlists-learn',
  'dsa-task-09': 'dsa-stacksqueues-learn',
  'sql-task-01': 'sql-select-where-learn',
  'sql-task-02': 'sql-join-learn',
  'sql-task-03': 'sql-groupby-learn',
  'sql-task-04': 'sql-subqueries-learn',
}

export const legacyTaskPairMap: Record<string, [string, string]> = {
  'java-task-01': ['java-basics-learn', 'java-basics-practice'],
  'java-task-02': ['java-variables-learn', 'java-variables-practice'],
  'java-task-03': ['java-ifelse-learn', 'java-ifelse-practice'],
  'java-task-04': ['java-methods-learn', 'java-methods-practice'],
  'java-task-05': ['java-arrays-learn', 'java-arrays-practice'],
  'java-task-06': ['java-strings-learn', 'java-strings-practice'],
  'java-task-07': ['java-oop-learn', 'java-oop-practice'],
  'java-task-08': ['java-constructors-learn', 'java-constructors-practice'],
  'java-task-09': ['java-inheritance-learn', 'java-inheritance-practice'],
  'java-task-10': ['java-polymorphism-learn', 'java-polymorphism-practice'],
  'java-task-11': ['java-collections-learn', 'java-collections-practice'],
  'java-task-12': ['java-exceptions-learn', 'java-exceptions-practice'],
  'dsa-task-01': ['dsa-complexity-learn', 'dsa-complexity-practice'],
  'dsa-task-02': ['dsa-arrays-learn', 'dsa-arrays-practice'],
  'dsa-task-03': ['dsa-twopointers-learn', 'dsa-twopointers-practice'],
  'dsa-task-04': ['dsa-slidingwindow-learn', 'dsa-slidingwindow-practice'],
  'dsa-task-05': ['dsa-stringshashing-learn', 'dsa-stringshashing-practice'],
  'dsa-task-06': ['dsa-searching-learn', 'dsa-searching-practice'],
  'dsa-task-07': ['dsa-sorting-learn', 'dsa-sorting-practice'],
  'dsa-task-08': ['dsa-linkedlists-learn', 'dsa-linkedlists-practice'],
  'dsa-task-09': ['dsa-stacksqueues-learn', 'dsa-stacksqueues-practice'],
  'sql-task-01': ['sql-select-where-learn', 'sql-select-where-practice'],
  'sql-task-02': ['sql-join-learn', 'sql-join-practice'],
  'sql-task-03': ['sql-groupby-learn', 'sql-groupby-practice'],
  'sql-task-04': ['sql-subqueries-learn', 'sql-subqueries-practice'],
}

export const curriculum: Curriculum = {
  id: 'mylaunch-career-preparation',
  title: 'Career Preparation Roadmap',
  subjects: attachMissingResources(subjectSeeds.map(buildSubject)),
}

export function getCurriculumTasks(source: Curriculum = curriculum): CurriculumTask[] {
  return source.subjects.flatMap((subject) =>
    subject.modules.flatMap((module) =>
      module.topics.flatMap((topic) => topic.tasks),
    ),
  )
}

export function migrateTaskId(taskId: string): string {
  return legacyTaskMap[taskId] ?? taskId
}

export function migrateTaskIds(taskIds: Iterable<string>): string[] {
  return [...taskIds].map((taskId) => migrateTaskId(taskId))
}
