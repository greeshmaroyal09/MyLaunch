import type { Curriculum, CurriculumTrack, CurriculumTask, Subject, Topic } from '../domain/curriculum'
import type { PracticeResource, TaskType } from '../domain/task'

type TopicSeed = {
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
  module: string
  topics?: TopicSeed[]
  pairedTopics?: PairedTopicSeed[]
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
  let previousTaskId: string | undefined
  const topics: Topic[] = (seed.topics ?? []).map((topicSeed, topicIndex) => {
    const taskId = `${seed.id}-task-${String(topicIndex + 1).padStart(2, '0')}`
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
      priority: 50,
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
  let previousTaskId: string | undefined
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
      priority: 50,
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
      priority: 50,
      required: true,
      dueOffsetDays: 0,
      prerequisiteTaskIds: [learnId],
      pairedTaskId: learnId,
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
    track: 'Primary',
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
    track: 'Primary',
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
    module: 'SQL — Joins + Multi-Table Queries',
    pairedTopics: [
      { key: 'select-where', learnTitle: 'SELECT / WHERE', practiceTitle: 'SELECT / WHERE Practice', description: 'Select columns and filter rows with predicates.', learnMinutes: 20, practiceMinutes: 20, learnResources: [makeResource('SQL SELECT', 'https://www.w3schools.com/sql/sql_select.asp', 'SQL reference/practice', 'Documentation', 'LEARN', { subject: 'SQL', topic: 'SELECT / WHERE' })], practiceResources: [makeResource('SQL WHERE practice', 'https://www.hackerrank.com/domains/sql', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'SQL', topic: 'SELECT / WHERE' })], legacyTaskId: 'sql-task-01' },
      { key: 'join', learnTitle: 'JOIN', practiceTitle: 'JOIN Practice', description: 'Combine related tables using common joins and multi-table queries.', learnMinutes: 25, practiceMinutes: 25, learnResources: [makeResource('SQL JOIN', 'https://www.w3schools.com/sql/sql_join.asp', 'SQL reference/practice', 'Tutorial', 'LEARN', { subject: 'SQL', topic: 'JOIN' })], practiceResources: [makeResource('SQL JOIN Problems', 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=join', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'SQL', topic: 'JOIN' })], legacyTaskId: 'sql-task-02' },
      { key: 'groupby', learnTitle: 'GROUP BY & Aggregates', practiceTitle: 'GROUP BY & Aggregates Practice', description: 'Summarize rows with grouping and aggregate functions.', learnMinutes: 25, practiceMinutes: 25, learnResources: [makeResource('GROUP BY', 'https://www.w3schools.com/sql/sql_groupby.asp', 'SQL reference/practice', 'Documentation', 'LEARN', { subject: 'SQL', topic: 'GROUP BY & Aggregates' })], practiceResources: [makeResource('Aggregate SQL Practice', 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=aggregation', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'SQL', topic: 'GROUP BY & Aggregates' })], legacyTaskId: 'sql-task-03' },
      { key: 'subqueries', learnTitle: 'Subqueries', practiceTitle: 'Subqueries Practice', description: 'Use nested queries to express dependent lookups.', learnMinutes: 30, practiceMinutes: 25, learnResources: [makeResource('SQL Subqueries', 'https://www.w3schools.com/sql/sql_subqueries.asp', 'SQL reference/practice', 'Tutorial', 'LEARN', { subject: 'SQL', topic: 'Subqueries' })], practiceResources: [makeResource('Subquery Practice', 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=select', 'HackerRank', 'Practice Problem', 'PRACTICE', { subject: 'SQL', topic: 'Subqueries' })], legacyTaskId: 'sql-task-04' },
    ],
  },
  {
    id: 'dbms', name: 'DBMS', track: 'Primary', module: 'DBMS — Relational Design & Transactions', topics: [
      { title: 'Relational Model', type: 'Learn', minutes: 25, description: 'Understand relations, keys, and integrity constraints.' },
      { title: 'Normalization', type: 'Learn', minutes: 30, description: 'Reason about functional dependencies and normal forms.' },
      { title: 'Transactions & ACID', type: 'Revision', minutes: 25, description: 'Review transaction guarantees and isolation basics.' },
    ],
  },
  {
    id: 'operating-systems', name: 'Operating Systems', track: 'Primary', module: 'Operating System Concepts', topics: [
      { title: 'Processes & Threads', type: 'Learn', minutes: 30, description: 'Compare processes, threads, and their execution state.' },
      { title: 'Scheduling & Concurrency', type: 'Practice', minutes: 30, description: 'Explore scheduling and synchronization fundamentals.' },
      { title: 'Memory Management', type: 'Learn', minutes: 30, description: 'Study virtual memory, paging, and address translation.' },
    ],
  },
  {
    id: 'computer-networks', name: 'Computer Networks', track: 'Primary', module: 'Network Foundations', topics: [
      { title: 'Network Layers', type: 'Learn', minutes: 25, description: 'Map common protocols to network layers.' },
      { title: 'TCP and UDP', type: 'Revision', minutes: 25, description: 'Compare transport protocols and their trade-offs.' },
      { title: 'HTTP & DNS', type: 'Learn', minutes: 30, description: 'Trace a web request through DNS and HTTP.' },
    ],
  },
  {
    id: 'backend-development', name: 'Backend Development', track: 'Primary', module: 'Backend 9.01 — REST APIs + Spring Boot', topics: [
      { title: 'HTTP & REST', type: 'Learn', minutes: 30, description: 'Design resource-oriented API endpoints and request flow.' },
      { title: 'Validation & Errors', type: 'Practice', minutes: 30, description: 'Validate input and return consistent errors.' },
      { title: 'Spring Boot Foundations', type: 'Learn', minutes: 35, description: 'Understand controllers, services, dependency injection, and application wiring.' },
      { title: 'Persistence Basics', type: 'Learn', minutes: 35, description: 'Connect application logic to persistent storage concepts and JPA/Hibernate later.' },
    ],
  },
  {
    id: 'git-github', name: 'Git/GitHub', track: 'Primary', module: 'Version Control', topics: [
      { title: 'Git Basics', type: 'Learn', minutes: 20, description: 'Track changes with repositories, commits, and status.' },
      { title: 'Branches & Merges', type: 'Practice', minutes: 25, description: 'Work with branches and resolve a simple merge.' },
      { title: 'GitHub Collaboration', type: 'Practice', minutes: 25, description: 'Use remotes and pull requests in a shared workflow.' },
    ],
  },
  {
    id: 'oop', name: 'OOP', track: 'Primary', module: 'Object-Oriented Design', topics: [
      { title: 'Encapsulation & Abstraction', type: 'Learn', minutes: 25, description: 'Design clear object boundaries and public contracts.' },
      { title: 'Inheritance & Composition', type: 'Revision', minutes: 25, description: 'Choose composition or inheritance for a design.' },
      { title: 'Polymorphism & Interfaces', type: 'Practice', minutes: 30, description: 'Use interfaces to separate behavior from implementation.' },
    ],
  },
  {
    id: 'system-design', name: 'System Design Fundamentals', track: 'Primary', module: 'System Design Foundations', topics: [
      { title: 'Requirements & Estimation', type: 'Learn', minutes: 30, description: 'Clarify requirements and estimate basic system load.' },
      { title: 'APIs & Data Modeling', type: 'Practice', minutes: 30, description: 'Sketch API contracts and a simple data model.' },
      { title: 'Caching & Scaling Basics', type: 'Learn', minutes: 35, description: 'Explore caching, bottlenecks, and horizontal scaling.' },
    ],
  },
  {
    id: 'python', name: 'Python', track: 'AI / ML', module: 'Python 7 — Practical Scripting', topics: [
      { title: 'Python Basics', type: 'Learn', minutes: 25, description: 'Review core syntax, values, and built-in data types.' },
      { title: 'Functions & Collections', type: 'Practice', minutes: 30, description: 'Write functions that transform common collections.' },
      { title: 'Modules & Environments', type: 'Practice', minutes: 25, description: 'Organize code and work with project environments.' },
    ],
  },
  {
    id: 'numpy-pandas', name: 'NumPy/Pandas', track: 'AI / ML', module: 'Data Analysis Tools', topics: [
      { title: 'NumPy Arrays', type: 'Learn', minutes: 30, description: 'Create arrays and use vectorized operations.' },
      { title: 'Pandas DataFrames', type: 'Practice', minutes: 30, description: 'Load, inspect, and transform tabular data.' },
      { title: 'Cleaning & Summaries', type: 'Problem Solving', minutes: 30, description: 'Clean missing values and produce grouped summaries.' },
    ],
  },
  {
    id: 'machine-learning', name: 'Machine Learning', track: 'AI / ML', module: 'Machine Learning Fundamentals', topics: [
      { title: 'Learning Problem Types', type: 'Learn', minutes: 30, description: 'Distinguish supervised and unsupervised learning.' },
      { title: 'Features & Evaluation', type: 'Learn', minutes: 30, description: 'Prepare features and choose basic evaluation measures.' },
      { title: 'Baseline Model Practice', type: 'Practice', minutes: 35, description: 'Train and evaluate a simple baseline model.' },
    ],
  },
  {
    id: 'nlp', name: 'NLP', track: 'AI / ML', module: 'Natural Language Processing', topics: [
      { title: 'Text Preprocessing', type: 'Learn', minutes: 25, description: 'Normalize and tokenize text for analysis.' },
      { title: 'Text Representations', type: 'Learn', minutes: 30, description: 'Compare sparse and embedding-based representations.' },
    ],
  },
  {
    id: 'llm-fundamentals', name: 'LLM Fundamentals', track: 'AI / ML', module: 'Large Language Models', topics: [
      { title: 'Tokens & Context Windows', type: 'Learn', minutes: 25, description: 'Understand tokenization and context limits.' },
      { title: 'Prompting & Model Limits', type: 'Practice', minutes: 30, description: 'Evaluate prompts and recognize model limitations.' },
    ],
  },
  {
    id: 'rag', name: 'RAG', track: 'AI / ML', module: 'Retrieval-Augmented Generation', topics: [
      { title: 'Retrieval Pipeline', type: 'Learn', minutes: 30, description: 'Trace chunking, retrieval, and grounded generation.' },
      { title: 'RAG Evaluation', type: 'Practice', minutes: 30, description: 'Inspect retrieval quality and answer grounding.' },
    ],
  },
  {
    id: 'fastapi', name: 'FastAPI', track: 'AI / ML', module: 'FastAPI Foundations', topics: [
      { title: 'Routes & Schemas', type: 'Learn', minutes: 30, description: 'Define typed request and response models.' },
      { title: 'Async Endpoints', type: 'Practice', minutes: 30, description: 'Build and reason about asynchronous endpoints.' },
    ],
  },
  {
    id: 'mlops', name: 'MLOps Fundamentals', track: 'AI / ML', module: 'MLOps Foundations', topics: [
      { title: 'Experiment Tracking', type: 'Learn', minutes: 30, description: 'Record model parameters, metrics, and artifacts.' },
      { title: 'Model Serving & Monitoring', type: 'Learn', minutes: 35, description: 'Review deployment and basic model monitoring.' },
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
          return hasResource || !resourceCoverage[task.id]
            ? task
            : { ...task, practiceResources: resourceCoverage[task.id] }
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
