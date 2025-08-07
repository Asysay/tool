import json
import os
import sys
import uuid
from collections import Counter
from datetime import datetime
import random
from openai import OpenAI
from dotenv import load_dotenv

from flask import Flask, render_template, request, make_response, redirect, \
    url_for, jsonify

from parser import Parser

# set the project root directory as the templates folder, you can set others.
app = Flask(__name__)

load_dotenv()
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")

# All experiments are saved in the source folder 'resources/experiments'.
experiments_path = os.path.join("resources", "experiments")

# The list experiments contains all the files in the experiment directory
(_, _, experiments) = next(os.walk(experiments_path))

# Counters of how many experiments have started
# For this example, the possible options are:
# Experiment1 bug first
# Experiment1 bug last
experiments_started1 = Counter()
experiments_started1['task_1_bf'] = 0
experiments_started1['task_1_bl'] = 0
experiments_started2 = Counter()
experiments_started2['task_2_bf'] = 0
experiments_started2['task_2_bl'] = 0


# Counters of how many experiments have concluded
experiments_concluded1 = Counter()
experiments_concluded1['task_1_bf'] = 0
experiments_concluded1['task_1_bl'] = 0
experiments_concluded2 = Counter()
experiments_concluded2['task_2_bf'] = 0
experiments_concluded2['task_2_bl'] = 0

order_started = Counter()
order_started['task1_first'] = 0
order_started['task2_first'] = 0

order_concluded = Counter()
order_concluded['task1_first'] = 0
order_concluded['task2_first'] = 0

session = {}


# Creation of log file based on id name
html_tags = ["<li", "<ul", "<a"]

p = Parser()

def generate_order() -> list[str]:
    min_val = order_concluded.most_common()[-1][1]
    mins = []
    for k in order_concluded:
        if order_concluded[k] == min_val:
            mins.append(k)

    if len(mins) > 1:

        min = sys.maxsize
        to_assing = ''
        for k in mins:
            if order_started[k] < min:
                min = order_started[k]
                to_assing = k
    else:
        to_assing = mins[0]

    print("Assigned first task to " + to_assing)

    if to_assing == 'task1_first':
        # assign to experiment task 1 first
        cr = ['experiment','experiment2']
    else:
        # assign to experiment task 2 first
        cr = ['experiment2','experiment']


    order_started[to_assing] += 1
    

    return cr

def choose_experiment1():
    """
    Assign an experiment to a new user. We choose the type of experiment
    that has the least amount of concluded experiments.
    If we have more than one such case, we choose the one that has the
    least amount of started experiments.
    """
    min_val1 = experiments_concluded1.most_common()[-1][1]

    mins1 = []
    for k in experiments_concluded1:
        if experiments_concluded1[k] == min_val1:
            mins1.append(k)

    if len(mins1) > 1:
        # more than 1 type has the same amount of concluded
        # experiments. Hence, we choose the one that has the least amount of
        # started ones
        min = sys.maxsize
        to_assing = ''
        for k in mins1:
            if experiments_started1[k] < min:
                min = experiments_started1[k]
                to_assing1 = k
    else:
        to_assing1 = mins1[0]

    print("Assigned task 1 to " + to_assing1)

    if to_assing1 == 'task_1_bf':
        # assign to experiment task 1 with bug first
        cr1 = 'files_experiment1_bf'
    else:
        # assign to experiment task 1 with bug last
        cr1 = 'files_experiment1_bl'
        
    
    # elif to_assing == 'task_2_bug_first':
    # assign to experiment task 2 with bug first
    #   cr = 'files_experiment2_bf'
    # else:
    # assign to experiment task 2 with bug last
    #   cr = 'files_experiment2_bl'

    experiments_started1[to_assing] += 1
    

    return cr1

def choose_experiment2():
    min_val2 = experiments_concluded2.most_common()[-1][1]

    mins2 = []
    for k in experiments_concluded2:
        if experiments_concluded2[k] == min_val2:
            mins2.append(k)

    if len(mins2) > 1:
        # more than 1 type has the same amount of concluded
        # experiments. Hence, we choose the one that has the least amount of
        # started ones
        min = sys.maxsize
        to_assing = ''
        for k in mins2:
            if experiments_started2[k] < min:
                min = experiments_started2[k]
                to_assing2 = k
    else:
        to_assing2 = mins2[0]
        
    print("Assigned task 2 to " + to_assing2)
    if to_assing2 == 'task_2_bf':
        # assign to experiment task 1 with bug first
        cr2 = 'files_experiment2_bf'
    else:
        # assign to experiment task 1 with bug last
        cr2 = 'files_experiment2_bl'
       
    experiments_started2[to_assing] += 1
    
    return cr2
        


# Loading of the main page
@app.route('/')
def index():
    """
    Start of the application. It return the file "templates/index.html" and
    create the unique identifier "userid", if not already found.
    """
    resp = make_response(render_template('index.html',
                                         title="Intro"))
    user_id = request.cookies.get('experiment-userid', None)


    if user_id is None:
        user_id = uuid.uuid4()
        resp.set_cookie('experiment-userid', str(user_id))
        print(f'Userid was None, now is {user_id}')
    session["order"] = generate_order()
    session["index"] = 0
    resp.set_cookie('experiment-order', session["order"][0])
    return resp


# Loading of Personal Information Survey.
@app.route("/dem_questions", methods=['GET', 'POST'])
def load_questions():
    """
    Loading of Demographic Questions. These questions can be found and
    changed in "templates/dem_questions.html"
    """
    user_id = request.cookies.get('experiment-userid', 'userNotFound')
    if request.method == 'POST':
        data: dict = request.form.to_dict()
        log_received_data(user_id, data)
    first_time = request.cookies.get('experiment-dem-questions', 'experiment-dem-not_done')

    if first_time == 'experiment-dem-not_done':
        log_data(str(user_id), "start", "dem_questions")
        resp = make_response(render_template('dem_questions.html',
                                             title="Demographics Questions"))
        resp.set_cookie('experiment-order-questions', 'experiment-order-done')
        return resp
    else:
        return redirect(url_for('already_done'))
    
@app.route("/trust_questions", methods=['GET', 'POST'])
def load_trustquestions():
    """
    Loading of Demographic Questions. These questions can be found and
    changed in "templates/trust_questions.html"
    """
    user_id = request.cookies.get('experiment-userid', 'userNotFound')
    if request.method == 'POST':
        data: dict = request.form.to_dict()
        log_received_data(user_id, data)
    first_time = request.cookies.get('experiment-trust-questions', 'experiment-trust-not_done')

    if first_time == 'experiment-trust-not_done':
        log_data(str(user_id), "start", "trust_questions")
        resp = make_response(render_template('trust_questions.html',
                                             title="Questions Regarding trust in AI"))
        resp.set_cookie('experiment-order-questions', 'experiment-order-done')
        return resp
    else:
        return redirect(url_for('already_done'))


@app.route("/experiment_final", methods=['GET', 'POST'])
def run_experiment_final_review():
    user_id = request.cookies.get('experiment-userid', 'userNotFound')
    session.pop("order", None)
    session.pop("index", None)
    if request.method == 'POST':
        data: dict = request.form.to_dict()
        log_received_data(user_id, data)
    log_data(str(user_id), "start", "cr-experiment-final")

    # Retrieving treatment information
    cr_file = request.cookies.get('experiment-experimentCRtype')
    log_data(str(user_id), "setexperimentCRtype", cr_file)

    exp_is_done = request.cookies.get('experiment-final', 'experiment-final-not_done')

    if exp_is_done != 'experiment-final-done':
        experiment_snippets, experiment_body = read_experiment(cr_file)
        codes = build_experiments(experiment_snippets)

        comment_line_number = 0
        comment = ''

        resp = make_response(render_template("experiment_final.html",
                                             title='Code Review - Vulnerabilities',
                                             codes=codes,
                                             treatment=cr_file,
                                             comment_line_number=comment_line_number,
                                             comment=comment,
                                             md_body=experiment_body))
        resp.set_cookie('experiment2nd', 'experiment2nd-done')
        resp.set_cookie('experiment-experimentCRtype', cr_file)

        return resp

    else:
        return redirect(url_for('already_done'))


@app.route("/experiment_final2", methods=['GET', 'POST'])
def run_experiment_final_review2():
    user_id = request.cookies.get('experiment-userid', 'userNotFound')

    if request.method == 'POST':
        data: dict = request.form.to_dict()
        log_received_data(user_id, data)
    log_data(str(user_id), "start", "cr-experiment-final2")

    cr_file2 = request.cookies.get('experiment-experimentCRtype2')
    log_data(str(user_id), "setexperimentCRtype2", cr_file2)

    exp_is_done = request.cookies.get('experiment-final2', 'experiment-final2-not_done')

    if exp_is_done != 'experiment-final2-done':
        experiment_snippets, experiment_body = read_experiment(cr_file2)
        codes = build_experiments(experiment_snippets)

        comment_line_number = 0
        comment = ''

        resp = make_response(render_template("experiment_final2.html",
                                             title='Code Review - Vulnerabilities2',
                                             codes=codes,
                                             treatment=cr_file2,
                                             comment_line_number=comment_line_number,
                                             comment=comment,
                                             md_body=experiment_body))
        resp.set_cookie('experiment2nd', 'experiment2nd-done')
        resp.set_cookie('experiment-experimentCRtype2', cr_file2)
        return resp

    else:
        return redirect(url_for('already_done'))


@app.route("/experiment", methods=['GET', 'POST'])
def run_experiment():
    """
    Starts the first phase of the experiment.
    It reads the files from "resources/experiments" and populates the page.
    """

    user_id = request.cookies.get('experiment-userid', 'userNotFound')
    order: list[str] = session.get("order")
    index: int = session.get("index", 0)
    if request.method == 'POST':
      data: dict = request.form.to_dict()
      log_received_data(user_id, data)
    if not order or index >= len(order):
        # All content pages finished → ending page
        return redirect(url_for("run_experiment_final_review"))
    
    page_name = order[index]        
    session["index"] = index + 1
    
    if page_name == "experiment":

        log_data(str(user_id), "start", "cr-experiment")

        # Choosing experiment
        cr_file = choose_experiment1()
        log_data(str(user_id), "setexperimentCRtype", cr_file)
        exp_is_done = request.cookies.get('experimentCR', 'not_done')

        if exp_is_done != 'experimentCR-done':
            experiment_snippets, experiment_body = read_experiment(cr_file)
            codes = build_experiments(experiment_snippets)

            comment_line_number = 0
            comment = ''

            resp = make_response(render_template("experiment.html",
                                                 title='Code Review Experiment (store)',
                                                 codes=codes,
                                                 comment_line_number=comment_line_number,
                                                 comment=comment,
                                                 md_body=experiment_body))
            resp.set_cookie('experiment-init-questions', 'init-questions-done')
            resp.set_cookie('experiment-experimentCRtype', cr_file)
            return resp
        else:
            return redirect(url_for('already_done'))
    else:
        log_data(str(user_id), "start", "cr-experiment2")

        # Choosing experiment
        cr_file = choose_experiment2()
        log_data(str(user_id), "setexperimentCR2type", cr_file)
        exp_is_done = request.cookies.get('experimentCR2', 'not_done')

        if exp_is_done != 'experimentCR2-done':
            experiment_snippets, experiment_body = read_experiment(cr_file)
            codes = build_experiments(experiment_snippets)

            comment_line_number = 0
            comment = ''

            resp = make_response(render_template("experiment2.html",
                                                 title='Code Review Experiment (bank)',
                                                 codes=codes,
                                                 comment_line_number=comment_line_number,
                                                 comment=comment,
                                                 md_body=experiment_body))
            resp.set_cookie('experiment-init-questions2', 'init-questions2-done')
            resp.set_cookie('experiment-experimentCRtype2', cr_file)
            return resp
        else:
            return redirect(url_for('already_done'))    
    


@app.route("/experiment_concluded", methods=['GET', 'POST'])
def experiment_concluded():
    """
    After the experiment, we report to the participants all the bugs that
    were present in the code, and ask their opinion on why they missed/caught
    them.
    """
    user_id = request.cookies.get('experiment-userid', 'userNotFound')
    exp_type = request.cookies.get('experiment-experimentCRtype')
    exp_is_done = request.cookies.get('experiment-experimentCR', 'not_done')
    if request.method == 'POST':
        data: dict = request.form.to_dict()
        log_received_data(user_id, data)

    log_data(str(user_id), "end", "cr_experiment")

    if exp_is_done != 'DONE':
        experiment_snippets, _ = read_experiment(exp_type)
        code = experiment_snippets['0']['R']
        if exp_type == 'files_experiment2_bf':
            bugs = [{
                'comment': 'The check should be "small < total", otherwise it '
                           'can return -1 in cases in which there are enough '
                           'small boxes. For example, total = 20, big = 3, '
                           'small = 5.',
                'line_number': 26,
                'bug_number': 'Bug B'
            }, {
                'comment': 'small and big could be null too',
                'line_number': 18,
                'bug_number': 'Bug A'
            }]
        else:
            bugs = [{
                'comment': 'If one of the 2 numbers is bigger than the other, '
                           'the corresponding value will be null, raising a '
                           'NPE.',
                'line_number': 17,
                'bug_number': 'Bug A'
            }, {
                'comment': 'This check should be > (without the =). '
                           'Otherwise when there is no carry the program '
                           'will append a 0.',
                'line_number': 29,
                'bug_number': 'Bug B'
            }]
        resp = make_response(
            render_template("experiment_concluded.html",
                            title="Experiment concluded",
                            code=code,
                            bugs=bugs))
        return resp
    else:
        return redirect(url_for('already_done'))


@app.route("/feedback", methods=['GET', 'POST'])
def feedback():
    """
    As for the demographics, we ask the participants for feedback.
    Return the page "templates/feedback.html"
    """
    user_id = request.cookies.get('experiment-userid', 'userNotFound')
    if request.method == 'POST':
        data: dict = request.form.to_dict()
        log_received_data(user_id, data)

    resp = make_response(render_template("feedback.html", title='Feedback'))
    resp.set_cookie('experiment-dem-questions', 'experiment-dem-questions-done','experiment-trust-questions', 'experiment-trust-done')
    resp.set_cookie('experimentCR', 'experimentCR-done')
    resp.set_cookie('experimentCR2', 'experimentCR2-done')
    return resp


@app.route('/data_policy', methods=['GET', 'POST'])
def data_policy():
    """
    Before the experiment, the participant should agree with the data handling policy
    Return the page "templates/data_policy.html"
    """
    resp = make_response(render_template("data_policy.html", title='Data Policy'))
    resp.set_cookie('data_policy', 'open')
    return resp


@app.route("/conclusion", methods=['GET', 'POST'])
def conclusion():
    """
    Finally, thank the participant.
    Return "templates/conclusion.html"
    """
    user_id = request.cookies.get('experiment-userid', 'userNotFound')

    if request.method == 'POST':
        data: dict = request.form.to_dict()
        log_received_data(user_id, data)

    log_data(str(user_id), "end", "experiment_concluded")

    exp_type = request.cookies.get('experiment-experimentCRtype')

    if exp_type == 'files_experiment1_bf':
        experiments_concluded1['task_1_bf'] += 1
    elif exp_type == 'files_experiment1':
        experiments_concluded1['task_1_bl'] += 1
    
    exp_type2 = request.cookies.get('experiment-experimentCRtype2')

    if exp_type == 'files_experiment2_bf':
        experiments_concluded2['task_2_bf'] += 1
    elif exp_type == 'files_experiment2_bl':
        experiments_concluded2['task_2_bl'] += 1
     
    order_type = request.cookies.get('experiment-order')

    if order_type == ['experiment','experiment2']:
        experiments_concluded2['task1_first'] += 1
    elif order_type == ['experiment2','experiment']:
        experiments_concluded2['task2_first'] += 1

    conclusion_text = "    <h1>Conclusion</h1> " \
                      "    <p>Congrats! You have concluded your experiment!</p> " \
                      "    <p>The Prolific code for this experiment is: </p> " \
                      "    <p>Thanks,</p> " \
                      "    <p>Alexey Buyakofu, Neha Singh, Alberto Bacchelli</p> "
    return render_template("conclusion.html", title='Conclusion',
                           conclusion=conclusion_text)


def build_experiments(experiment_snippets):
    codes = []
    for num_experiment in experiment_snippets:
        experiment_snippet = experiment_snippets[num_experiment]
        codes.append({
            "id": num_experiment,
            "filename": experiment_snippet['filename'],
            "linecount": max(experiment_snippet['num_lines_L'],
                             experiment_snippet['num_lines_R']),
            "contextLineCount": 1,
            "left_line_number": 1,
            "left_content": experiment_snippet['L'],
            "right_line_number": 1,
            "right_content": experiment_snippet['R'],
            "prefix_line_count": 1,
            "prefix_escaped": 1,
            "suffix_escaped": 1,
        })
    return codes


@app.route("/already_done", methods=['GET', 'POST'])
def already_done():
    """
    Forbids a participant that already concluded the experiment to re do it.
    Return the page "templates/conclusions.html"
    """
    user_id = request.cookies.get('experiment-userid', 'userNotFound')
    log_data(str(user_id), "already_done", "already_done")
    conclusion_text = "Sorry but it seems you already tried to answer the experiment." \
                      "<br>You can't take the experiment a second time, sorry!"
    return render_template("conclusion.html", title='Already done',
                           conclusion=conclusion_text)

def to_openai_messages(system_prompt, history, new_user_text, new_user_image):
    messages = []
    if system_prompt:
        messages.append({"role": "developer", "content": system_prompt})

    # history items are { time, role:"user2"|"bot2", content, isImage }
    for m in history or []:
        role = "user" if m.get("role") == "user2" or m.get("role") == "user2" else "assistant"
        if m.get("isImage"):
            parts = []
            # If you stored descriptive text, add it as a text part; many entries are image-only.
            if isinstance(m.get("content"), str) and not m["content"].startswith("data:"):
                parts.append({"type": "text", "text": m["content"]})
            parts.append({
                "type": "image_url",
                "image_url": {"url": m["content"], "detail": "high"},
            })
            messages.append({"role": role, "content": parts})
        else:
            messages.append({"role": role, "content": m.get("content", "")})

    # current user turn
    if new_user_image:
        parts = []
        if new_user_text:
            parts.append({"type": "text", "text": new_user_text})
        parts.append({
            "type": "image_url",
            "image_url": {"url": new_user_image, "detail": "high"},
        })
        messages.append({"role": "user", "content": parts})
    elif new_user_text is not None:
        messages.append({"role": "user", "content": new_user_text})

    return messages

@app.post("/chat-api")
def chat_api():
    body = request.get_json(force=True)
    messages = to_openai_messages(
        body.get("system_prompt"),
        body.get("history") or [],
        body.get("new_user_text"),
        body.get("new_user_image"),
    )

    # Call OpenAI Chat Completions
    resp = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.7,
    )
    text = resp.choices[0].message.content or ""
    return jsonify({"type": "text", "content": text})

def log_received_data(user_id, data):
    for key in data.keys():
        if key == 'hidden_log':
            d = json.loads(data[key])
            for log in d['data']:
                splitted = log.strip().split(";")
                dt = splitted[0]
                action = splitted[1]
                info = ';'.join(splitted[2:])
                log_data(user_id, action, info, dt)
        else:
            log_data(user_id, key, data[key])


def read_files(filename):
    with open(os.path.join("resources", filename)) as f:
        return p.parse_md(f, has_code=False)


def log_data(user_id: str, key: str, data: str, dt: datetime = None):
    with open(f'{user_id}.log', 'a') as f:
        log_dt = dt if dt is not None else datetime.timestamp(datetime.now())

        f.write(f'{log_dt};'
                f'{key};'
                f'{data}\n')


# This function read the experiment content from experiments/ folder. Each
# file follow the same composition rule of the experiments.
def read_experiment(file_name):
    with open(os.path.join(experiments_path, file_name)) as file_content:
        snippets = p.parse_md(file_content, has_code=True)

    questions_experiment = file_name.replace('files', 'questions')
    body = ''
    if os.path.exists(os.path.join(experiments_path, questions_experiment)):
        with open(os.path.join(experiments_path, questions_experiment)) as \
                file_content:
            body = p.parse_md(file_content, has_code=False)
    return snippets, body


def contains_html_tags(string_to_check):
    return any(tag in string_to_check for tag in html_tags)
