import { Problems } from "./problems.js";
export const app = (() => {
    $("#btn-start").click(() => app.start());
    $("#btn-fetch").click(() => {
        const url = prompt("問題のURLを入力");
        if (!url)
            return;
        app.openURL(url);
    });
    $("#btn-open").click(() => app.openFile());
    $("#btn-edit").click(() => app.openEditor());
    const indAC = document.querySelector("#indicator-ac");
    const indWA = document.querySelector("#indicator-wa");
    if (!indAC || !indWA)
        throw new Error;
    const vm = new Vue({
        el: "#root",
        data: {
            numQue: 0,
            nAllQues: 0,
            points: 0,
            time: 0,
            numAC: 0,
            numWA: 0,
            question: "Are you fine?",
            answers: [
                { isCorrect: true, text: "Yes!" },
                { isCorrect: true, text: "No..." }
            ]
        },
        methods: {
            msecsToString(msec) {
                const msecStr = (msec % 1000 + "").padEnd(3, "0");
                const secStr = (~~(msec / 1e3) % 60 + "").padStart(2, "0");
                const minStr = (~~(msec / 60e3) + "").padStart(2, "0");
                return `${minStr}:${secStr}.${msecStr}`;
            },
            checkAnswer(isCorrect) {
                if (!timer)
                    return;
                if (isCorrect) {
                    const currentTime = Date.now();
                    vm.points += Math.floor(10e3 / Math.sqrt(currentTime - lapTime + 1));
                    vm.numQue++;
                    vm.numAC++;
                    lapTime = currentTime;
                    indAC.classList.add("show");
                    setTimeout(() => indAC.classList.remove("show"), 200);
                    nextQuestion();
                }
                else {
                    vm.numWA++;
                    lapTime -= 10e3;
                    indWA.classList.add("show");
                    setTimeout(() => indWA.classList.remove("show"), 300);
                }
            }
        }
    });
    let problems = new Problems();
    let iterator = null;
    let baseTime = 0;
    let lapTime = 0;
    let timer = null;
    function setProblems(_problems) {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        problems = _problems;
    }
    function stop() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        vm.question = "";
        vm.answers = [];
    }
    function nextQuestion() {
        if (!iterator)
            return;
        const { value: problem, done } = iterator.next();
        if (done) {
            stop();
            showInfo(`Finished!\nYour score: ${vm.points}`);
        }
        else {
            vm.question = problem.question;
            vm.answers = problem.answers;
        }
    }
    function showInfo(text) {
        const alert = document.createElement("div");
        alert.className = "alert alert-info alert-dismissible fade show fixed-top";
        alert.textContent = text;
        const btnClose = alert.appendChild(document.createElement("button"));
        btnClose.type = "button";
        btnClose.className = "close";
        btnClose.dataset.dismiss = "alert";
        btnClose.appendChild(document.createElement("span")).textContent = "×";
        document.body.appendChild(alert);
    }
    return {
        get problems() {
            return problems;
        },
        set problems(_problems) {
            problems.splice(0);
            problems.push(..._problems);
        },
        start() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            vm.nAllQues = problems.length;
            vm.numQue = 0;
            vm.points = 0;
            vm.time = 0;
            iterator = problems.shuffled().values();
            baseTime = lapTime = Date.now();
            timer = setInterval(() => {
                vm.time = Date.now() - baseTime;
            }, 30);
            nextQuestion();
        },
        async openURL(url) {
            const res = await fetch(url);
            const text = await res.text();
            setProblems(Problems.parse(text));
        },
        openFile() {
            const input = document.createElement("input");
            input.type = "file";
            input.onchange = async () => {
                if (!input.files)
                    return;
                const file = input.files[0];
                const text = await file.text();
                setProblems(Problems.parse(text));
            };
            input.click();
        },
        openEditor() {
            editor.setProblems(problems.slice());
            $("#editor").modal();
        }
    };
})();
export const editor = (() => {
    const vm = new Vue({
        el: "#editor",
        data: {
            title: "",
            problems: []
        },
        methods: {
            addProblem() {
                vm.problems.push({
                    question: "",
                    answers: [{ isCorrect: true, text: "" }]
                });
            },
            addAnswer(problem) {
                problem.answers.push({ isCorrect: true, text: "" });
            },
            download(event) {
                app.problems = vm.problems;
                event.target.href = editor.link;
            },
            remove(array, element) {
                const index = array.indexOf(element);
                if (~index)
                    array.splice(index, 1);
            }
        }
    });
    $("#editor").on("hide.bs.modal", () => {
        app.problems = vm.problems;
    });
    let link = null;
    return {
        get link() {
            const text = app.problems.toString();
            const data = new Blob([new TextEncoder().encode(text)], { type: "text/plain" });
            console.log(text);
            if (link)
                URL.revokeObjectURL(link);
            link = URL.createObjectURL(data);
            return link;
        },
        setProblems(problems) {
            vm.problems = problems;
        }
    };
})();
if (location.search.match(/(http.+)$/)) {
    app.openURL(decodeURIComponent(RegExp.$1));
}
